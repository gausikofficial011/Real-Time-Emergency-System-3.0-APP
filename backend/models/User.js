const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'patient', 'driver', 'admin', 'hospital_staff', 'superadmin'],
      default: 'user',
    },
    healthProfile: {
      bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
        default: 'Unknown',
      },
      allergies: [{ type: String, trim: true }],
      medications: [{ type: String, trim: true }],
      primaryPhone: { type: String, trim: true, default: '' },
      chronicConditions: { type: String, trim: true, default: '' },
      residentialAddress: { type: String, trim: true, default: '' },
      emergencyContacts: [
        {
          name: { type: String, trim: true },
          phone: { type: String, trim: true },
          relation: { type: String, trim: true },
        },
      ],
      preferredHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        default: null,
      },
      timeline: [
        {
          category: { type: String, default: 'General' },
          notes: { type: String, default: '' },
          attachmentUrl: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
        }
      ]
    },
    driverProfile: {
      vehicleNumber: { type: String, trim: true, uppercase: true },
      licenseNumber: { type: String, trim: true, uppercase: true },
      currentStatus: {
        type: String,
        enum: ['available', 'dispatched', 'on_scene', 'returning', 'maintenance'],
        default: 'available',
      },
      currentAmbulance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ambulance',
        default: null,
      },
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      lastUpdated: { type: Date, default: null },
    },
    profilePhoto: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for geospatial and common queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
