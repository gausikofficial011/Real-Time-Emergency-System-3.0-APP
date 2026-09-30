const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    equipmentLevel: {
      type: String,
      enum: ['basic', 'advanced', 'critical_care'],
      default: 'basic',
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'on_scene', 'returning', 'maintenance'],
      default: 'available',
    },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      lastUpdated: { type: Date, default: null },
    },
    currentEmergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      default: null,
    },
    specifications: {
      capacity: { type: Number, default: 2 },
      yearOfManufacture: { type: Number, default: null },
      lastServiced: { type: Date, default: null },
      fuelType: { type: String, default: 'Diesel' },
      make: { type: String, default: '' },
      model: { type: String, default: '' },
    },
    totalTrips: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ambulanceSchema.index({ status: 1 });
ambulanceSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });
ambulanceSchema.index({ hospital: 1 });
ambulanceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
