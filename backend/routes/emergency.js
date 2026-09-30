const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const Emergency = require('../models/Emergency');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { emitNewEmergency, emitStatusUpdate } = require('../sockets');

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  return null;
};

// Create handler helper
const createEmergency = async (req, res) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { incidentType, location, victimCount = 1, description, severity, isHighway, age } = req.body;

    // Call AI service for prediction
    let aiPrediction = null;
    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL}/predict`,
        {
          incident_type: incidentType,
          victim_count: victimCount,
          age: age || 30,
          is_highway: isHighway || false,
          hour_of_day: new Date().getHours(),
        },
        { timeout: 3000 }
      );
      aiPrediction = {
        severity: aiResponse.data.severity,
        confidence: aiResponse.data.confidence,
        recommendation: aiResponse.data.recommendation,
        predictedAt: new Date(),
      };
    } catch (aiErr) {
      console.warn('AI service unavailable, skipping prediction:', aiErr.message);
    }

    const emergency = await Emergency.create({
      reportedBy: req.user._id,
      incidentType,
      location,
      severity: aiPrediction?.severity || severity || 'medium',
      victimCount,
      description,
      isHighway: isHighway || false,
      aiPrediction,
    });

    await emergency.populate('reportedBy', 'name email phone');

    // Emit to admins
    emitNewEmergency({
      emergency,
      message: `New ${incidentType} emergency reported!`,
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, message: 'Emergency reported.', emergency });
  } catch (err) {
    console.error('Create emergency error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createValidationRules = [
  body('incidentType').isIn(['medical', 'accident', 'fire', 'natural_disaster', 'crime']).withMessage('Invalid incident type'),
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('victimCount').optional().isInt({ min: 1, max: 500 }).withMessage('Victim count must be between 1 and 500'),
];

// ─── POST /api/emergency ──────────────────────────────────────────────────────
router.post('/', authenticate, createValidationRules, createEmergency);

// ─── POST /api/emergency/create ───────────────────────────────────────────────
router.post('/create', authenticate, createValidationRules, createEmergency);

router.get('/all', authenticate, async (req, res) => {
  try {
    const { status, type, severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    // Restrict standard users to only see their own incidents
    if (req.user.role === 'user' || req.user.role === 'patient') {
      filter.reportedBy = req.user._id;
    }

    if (status) filter.status = status;
    if (status) filter.status = status;
    if (type) filter.incidentType = type;
    if (severity) filter.severity = severity;

    const emergencies = await Emergency.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('reportedBy', 'name email')
      .populate('assignedAmbulance', 'vehicleNumber equipmentLevel status currentLocation')
      .populate('assignedHospital', 'name address location availableBeds');

    const total = await Emergency.countDocuments(filter);

    res.json({
      success: true,
      emergencies,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/emergency/active ────────────────────────────────────────────────
router.get('/active', authenticate, async (req, res) => {
  try {
    const emergencies = await Emergency.find({
      status: { $in: ['pending', 'assigned', 'in_progress'] },
    })
      .sort({ severity: -1, createdAt: 1 })
      .populate('reportedBy', 'name email')
      .populate('assignedAmbulance', 'vehicleNumber driver currentLocation')
      .populate('assignedHospital', 'name address');

    res.json({ success: true, emergencies, count: emergencies.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/emergency/stats ─────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [byStatus, bySeverity, byType] = await Promise.all([
      Emergency.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Emergency.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Emergency.aggregate([{ $group: { _id: '$incidentType', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      byStatus: Object.fromEntries(byStatus.map(x => [x._id, x.count])),
      bySeverity: Object.fromEntries(bySeverity.map(x => [x._id, x.count])),
      byType: Object.fromEntries(byType.map(x => [x._id, x.count])),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/emergency/:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id)
      .populate('reportedBy', 'name email healthProfile')
      .populate({ path: 'assignedAmbulance', populate: { path: 'driver', select: 'name driverProfile' } })
      .populate('assignedHospital');

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found.' });
    }
    res.json({ success: true, emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/emergency/update-status (admin/superadmin only) ──────────────────
router.put('/update-status', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { id, status, notes } = req.body;
    if (!id || !status) {
      return res.status(400).json({ success: false, message: 'Emergency id and status are required.' });
    }
    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const updates = { status };
    if (notes) updates.notes = notes;
    if (status === 'in_progress') updates.respondedAt = new Date();
    if (status === 'resolved') updates.resolvedAt = new Date();

    const emergency = await Emergency.findByIdAndUpdate(id, updates, { new: true })
      .populate('reportedBy', 'name')
      .populate('assignedAmbulance');

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found.' });
    }

    // Emit status update to the patient
    if (emergency.reportedBy?._id) {
      emitStatusUpdate(emergency.reportedBy._id.toString(), {
        emergencyId: emergency._id,
        status,
        message: `Your emergency status has been updated to: ${status}`,
        timestamp: new Date(),
      });
    }

    res.json({ success: true, message: 'Status updated.', emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/emergency/:id/status ────────────────────────────────────────────
router.put('/:id/status', authenticate, authorize('admin', 'superadmin', 'driver', 'hospital_staff'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const updates = { status };
    if (notes) updates.notes = notes;
    if (status === 'in_progress') updates.respondedAt = new Date();
    if (status === 'resolved') updates.resolvedAt = new Date();

    const emergency = await Emergency.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('reportedBy', 'name')
      .populate('assignedAmbulance');

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found.' });
    }

    // Emit status update to the patient
    if (emergency.reportedBy?._id) {
      emitStatusUpdate(emergency.reportedBy._id.toString(), {
        emergencyId: emergency._id,
        status,
        message: `Your emergency status has been updated to: ${status}`,
        timestamp: new Date(),
      });
    }

    res.json({ success: true, message: 'Status updated.', emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/emergency/:id (admin/superadmin only) ───────────────────────────
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('reportedBy', 'name email healthProfile')
      .populate('assignedAmbulance')
      .populate('assignedHospital');
    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found.' });
    }
    res.json({ success: true, message: 'Emergency updated.', emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /api/emergency/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found.' });
    }
    res.json({ success: true, message: 'Emergency cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
