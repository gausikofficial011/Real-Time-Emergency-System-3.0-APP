const express = require('express');
const router = express.Router();
const MedicalScheme = require('../models/MedicalScheme');
const { authenticate } = require('../middleware/auth');

// GET /api/medical-schemes - Get all schemes with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { state, category, search } = req.query;
    let query = {};

    if (state && state !== 'All') {
      query.state = state;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const schemes = await MedicalScheme.find(query).sort({ state: 1, name: 1 });
    
    // Get unique states and categories for filters
    const states = await MedicalScheme.distinct('state');
    const categories = await MedicalScheme.distinct('category');

    res.status(200).json({
      success: true,
      count: schemes.length,
      filters: { states, categories },
      schemes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
