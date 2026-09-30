const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    address: { type: String, trim: true, default: '' },
    location: {
      lat: { type: Number, required: [true, 'Latitude is required'] },
      lng: { type: Number, required: [true, 'Longitude is required'] },
    },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    type: {
      type: String,
      enum: ['government', 'private', 'trust', 'military', 'railway'],
      default: 'government',
    },
    totalBeds: { type: Number, default: 0, min: 0 },
    availableBeds: { type: Number, default: 0, min: 0 },
    icuBeds: { type: Number, default: 0, min: 0 },
    availableIcuBeds: { type: Number, default: 0, min: 0 },
    treatmentTypes: {
      type: [String],
      default: ['general'],
      enum: [
        'general', 'trauma', 'cardiac', 'burns', 'neurology',
        'pediatrics', 'orthopedics', 'obstetrics', 'oncology',
        'psychiatry', 'renal', 'respiratory', 'ophthalmology', 'ENT'
      ],
    },
    emergencyLevel: {
      type: String,
      enum: ['level1', 'level2', 'level3'],
      default: 'level2',
    },
    ambulances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' }],
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 4.0, min: 1, max: 5 },
    website: { type: String, default: '' },
    established: { type: Number, default: null },
  },
  { timestamps: true }
);

hospitalSchema.index({ 'location.lat': 1, 'location.lng': 1 });
hospitalSchema.index({ isActive: 1 });
hospitalSchema.index({ type: 1 });
hospitalSchema.index({ emergencyLevel: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
