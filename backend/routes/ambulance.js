const express = require('express');
const { body, validationResult } = require('express-validator');
const Ambulance = require('../models/Ambulance');
const Emergency = require('../models/Emergency');
const { authenticate, authorize } = require('../middleware/auth');
const { emitAmbulanceAssigned, emitAmbulanceLocation, emitAssignmentConfirmed, emitToDriver } = require('../sockets');

const router = express.Router();

// Haversine distance formula (returns km)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  return null;
};

// ─── GET /api/ambulance/all ───────────────────────────────────────────────────
router.get('/all', authenticate, async (req, res) => {
  try {
    const { status, equipmentLevel, hospital } = req.query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (equipmentLevel) filter.equipmentLevel = equipmentLevel;
    if (hospital) filter.hospital = hospital;

    const ambulances = await Ambulance.find(filter)
      .populate('driver', 'name email driverProfile')
      .populate('hospital', 'name address location')
      .populate('currentEmergency', 'emergencyId incidentType severity status');

    res.json({ success: true, ambulances, count: ambulances.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/ambulance/nearest ───────────────────────────────────────────────
router.get('/nearest', authenticate, async (req, res) => {
  try {
    const { lat, lng, type } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required.' });
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);

    const filter = { status: 'available', isActive: true };
    if (type) filter.equipmentLevel = type;

    const ambulances = await Ambulance.find(filter)
      .populate('driver', 'name driverProfile')
      .populate('hospital', 'name address');

    const withDistance = ambulances
      .filter((a) => a.currentLocation?.lat && a.currentLocation?.lng)
      .map((a) => ({
        ...a.toObject(),
        distanceKm: parseFloat(
          haversineDistance(targetLat, targetLng, a.currentLocation.lat, a.currentLocation.lng).toFixed(2)
        ),
        estimatedEtaMinutes: Math.round(
          haversineDistance(targetLat, targetLng, a.currentLocation.lat, a.currentLocation.lng) * 2
        ), // ~30 km/h average speed in city
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10); // Top 10 nearest

    res.json({ success: true, ambulances: withDistance, count: withDistance.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/ambulance/assign ────────────────────────────────────────────────
router.put('/assign', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { emergencyId, ambulanceId, hospitalId } = req.body;
    if (!emergencyId || !ambulanceId) {
      return res.status(400).json({ success: false, message: 'emergencyId and ambulanceId are required.' });
    }

    const [ambulance, emergency] = await Promise.all([
      Ambulance.findById(ambulanceId).populate('driver'),
      Emergency.findById(emergencyId).populate('reportedBy', 'name _id'),
    ]);

    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found.' });
    if (!emergency) return res.status(404).json({ success: false, message: 'Emergency not found.' });
    if (ambulance.status !== 'available') {
      return res.status(409).json({ success: false, message: 'Ambulance is not available.' });
    }

    // Update ambulance
    ambulance.status = 'dispatched';
    ambulance.currentEmergency = emergencyId;
    await ambulance.save();

    // Update emergency
    emergency.status = 'assigned';
    emergency.assignedAmbulance = ambulanceId;
    if (hospitalId) emergency.assignedHospital = hospitalId;
    emergency.respondedAt = new Date();
    await emergency.save();

    await emergency.populate(['assignedAmbulance', 'assignedHospital']);

    // Notify patient
    if (emergency.reportedBy?._id) {
      emitAmbulanceAssigned(emergency.reportedBy._id.toString(), {
        emergencyId: emergency._id,
        ambulance: {
          _id: ambulance._id,
          vehicleNumber: ambulance.vehicleNumber,
          equipmentLevel: ambulance.equipmentLevel,
          driver: ambulance.driver
            ? { name: ambulance.driver.name, phone: ambulance.driver.email }
            : null,
          currentLocation: ambulance.currentLocation,
        },
        hospital: hospitalId ? { _id: hospitalId } : null,
        message: 'An ambulance has been dispatched to your location!',
        timestamp: new Date(),
      });
    }

    // Notify driver
    if (ambulance.driver) {
      emitToDriver(ambulance.driver._id.toString(), 'dispatch_assigned', {
        emergency,
        message: 'New emergency dispatch assigned!',
        timestamp: new Date(),
      });
    }

    // Notify admins
    emitAssignmentConfirmed({
      emergencyId: emergency._id,
      ambulanceId: ambulance._id,
      vehicleNumber: ambulance.vehicleNumber,
      timestamp: new Date(),
    });

    res.json({ success: true, message: 'Ambulance dispatched successfully.', emergency });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/ambulance/:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id)
      .populate('driver', 'name email driverProfile')
      .populate('hospital', 'name address location')
      .populate('currentEmergency');
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found.' });
    res.json({ success: true, ambulance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/ambulance ──────────────────────────────────────────────────────
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const ambulance = await Ambulance.create(req.body);
    res.status(201).json({ success: true, message: 'Ambulance created.', ambulance });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/ambulance/:id/location ─────────────────────────────────────────
router.put('/:id/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng are required.' });
    }

    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { 'currentLocation.lat': lat, 'currentLocation.lng': lng, 'currentLocation.lastUpdated': new Date() },
      { new: true }
    ).populate('currentEmergency', 'reportedBy');

    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found.' });

    const locationData = { ambulanceId: ambulance._id, lat, lng, timestamp: new Date() };

    // Emit to patient if there's an active emergency
    if (ambulance.currentEmergency?.reportedBy) {
      emitAmbulanceLocation(ambulance.currentEmergency.reportedBy.toString(), locationData);
    } else {
      emitAmbulanceLocation(null, locationData); // Emit to admins only
    }

    res.json({ success: true, message: 'Location updated.', location: ambulance.currentLocation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/ambulance/:id/status ────────────────────────────────────────────
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'dispatched', 'on_scene', 'returning', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const updates = { status };
    // If returning to available, clear current emergency and increment trips
    if (status === 'available') {
      const currentAmb = await Ambulance.findById(req.params.id);
      if (currentAmb && currentAmb.status !== 'available' && currentAmb.status !== 'maintenance') {
        updates.currentEmergency = null;
        updates.$inc = { totalTrips: 1 };
      } else {
        updates.currentEmergency = null;
      }
    }

    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found.' });

    res.json({ success: true, message: 'Status updated.', ambulance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/ambulance/:id ───────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('driver hospital');
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found.' });
    res.json({ success: true, message: 'Ambulance updated.', ambulance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── DELETE /api/ambulance/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    await Ambulance.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Ambulance deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
