const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const emergencySchema = new mongoose.Schema(
  {
    emergencyId: {
      type: String,
      unique: true,
      default: () => `EM-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },
    incidentType: {
      type: String,
      enum: ['medical', 'accident', 'fire', 'natural_disaster', 'crime'],
      required: [true, 'Incident type is required'],
    },
    location: {
      lat: { type: Number, required: [true, 'Latitude is required'] },
      lng: { type: Number, required: [true, 'Longitude is required'] },
      address: { type: String, default: '' },
      landmark: { type: String, default: '' },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'resolved', 'cancelled'],
      default: 'pending',
    },
    victimCount: { type: Number, default: 1, min: 1, max: 500 },
    description: { type: String, default: '', maxlength: 1000 },
    aiPrediction: {
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      confidence: { type: Number, min: 0, max: 1 },
      recommendation: { type: String },
      predictedAt: { type: Date },
    },
    assignedAmbulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambulance',
      default: null,
    },
    assignedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    respondedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    images: [{ type: String }],
    notes: { type: String, default: '' },
    isHighway: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for performance
emergencySchema.index({ status: 1 });
emergencySchema.index({ severity: 1 });
emergencySchema.index({ incidentType: 1 });
emergencySchema.index({ createdAt: -1 });
emergencySchema.index({ reportedBy: 1 });
emergencySchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Auto-generate emergencyId if missing
emergencySchema.pre('save', function (next) {
  if (!this.emergencyId) {
    this.emergencyId = `EM-${uuidv4().slice(0, 8).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Emergency', emergencySchema);
