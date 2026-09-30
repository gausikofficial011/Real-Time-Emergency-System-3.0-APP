const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  policyNumber: {
    type: String,
    required: true,
    unique: true
  },
  policyName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['health', 'life'],
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  sumInsured: {
    type: Number,
    required: true
  },
  premium: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'lapsed'],
    default: 'active'
  }
}, { timestamps: true });

const claimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  policyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy',
    required: true
  },
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  },
  claimAmount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  documents: [{
    name: String,
    url: String,
    fileType: String
  }],
  processedDate: Date,
  adminNotes: String
}, { timestamps: true });

const InsurancePolicy = mongoose.model('InsurancePolicy', policySchema);
const InsuranceClaim = mongoose.model('InsuranceClaim', claimSchema);

module.exports = { InsurancePolicy, InsuranceClaim };
