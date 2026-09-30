const mongoose = require('mongoose');

const medicalSchemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  benefits: [{
    type: String
  }],
  eligibility: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true,
    index: true // index for state-wise filtering
  },
  category: {
    type: String,
    enum: ['Insurance', 'Financial Assistance', 'Subsidy', 'Free Treatment', 'Other'],
    default: 'Other'
  },
  officialLink: {
    type: String
  },
  launchedYear: {
    type: Number
  },
  documentsRequired: [String]
}, { timestamps: true });

module.exports = mongoose.model('MedicalScheme', medicalSchemeSchema);
