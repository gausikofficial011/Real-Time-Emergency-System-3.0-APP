const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['announcement', 'fundraiser', 'emergency_alert'],
      default: 'announcement',
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    // For fundraisers
    targetAmount: {
      type: Number,
      default: 0,
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    patientName: String,
    hospitalName: String,
    
    image: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
