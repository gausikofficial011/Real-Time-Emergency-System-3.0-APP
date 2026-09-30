const express = require('express');
const router = express.Router();
const { InsurancePolicy, InsuranceClaim } = require('../models/Insurance');
const { authenticate } = require('../middleware/auth');

// ─────────────────────────────────────────────────
// POLICIES
// ─────────────────────────────────────────────────

// GET /api/insurance/policies - Get all policies for the logged-in user
router.get('/policies', authenticate, async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user._id });
    res.status(200).json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/insurance/policies - Add a new policy (can be used for mock seeding)
router.post('/policies', authenticate, async (req, res) => {
  try {
    const policy = await InsurancePolicy.create({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────
// CLAIMS
// ─────────────────────────────────────────────────

// GET /api/insurance/claims - Get all claims for the user
router.get('/claims', authenticate, async (req, res) => {
  try {
    const claims = await InsuranceClaim.find({ userId: req.user._id })
      .populate('policyId', 'policyName policyNumber provider')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: claims.length, claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/insurance/claims - Submit a new claim
router.post('/claims', authenticate, async (req, res) => {
  try {
    const { policyId, claimAmount, reason, emergencyId, documents } = req.body;

    // Verify policy belongs to user
    const policy = await InsurancePolicy.findOne({ _id: policyId, userId: req.user._id });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found or unauthorized' });
    }

    const claim = await InsuranceClaim.create({
      userId: req.user._id,
      policyId,
      claimAmount,
      reason,
      emergencyId,
      documents: documents || []
    });

    res.status(201).json({ success: true, claim });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
