const express = require('express');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/hospital/all ────────────────────────────────────────────────────
router.get('/all', authenticate, async (req, res) => {
  try {
    const { type, emergencyLevel } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (emergencyLevel) filter.emergencyLevel = emergencyLevel;

    const hospitals = await Hospital.find(filter)
      .sort({ name: 1 })
      .populate('ambulances', 'vehicleNumber status equipmentLevel');

    // Attach ambulance count
    const data = hospitals.map((h) => ({
      ...h.toObject(),
      ambulanceCount: h.ambulances?.length || 0,
    }));

    res.json({ success: true, hospitals: data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/hospital/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).populate(
      'ambulances',
      'vehicleNumber status equipmentLevel driver'
    );
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/hospital ───────────────────────────────────────────────────────
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({ success: true, message: 'Hospital created.', hospital });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Hospital with this name already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/hospital/update (admin/superadmin only) ─────────────────────────
router.put('/update', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Hospital id is required.' });
    }
    const hospital = await Hospital.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }
    res.json({ success: true, message: 'Hospital updated.', hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/hospital/:id ────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('admin', 'superadmin', 'hospital_staff'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, message: 'Hospital updated.', hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /api/hospital/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    await Hospital.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Hospital deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/hospital/:id/ambulances ──────────────────────────────────────────
router.get('/:id/ambulances', authenticate, async (req, res) => {
  try {
    const ambulances = await Ambulance.find({ hospital: req.params.id, isActive: true })
      .populate('driver', 'name')
      .populate('currentEmergency', 'emergencyId severity status');
    res.json({ success: true, ambulances, count: ambulances.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
