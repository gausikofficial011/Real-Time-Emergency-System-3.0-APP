const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// ─── Validation helper ────────────────────────────────────────────────────────
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  return null;
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'patient', 'driver', 'admin', 'hospital_staff', 'superadmin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const validationError = handleValidation(req, res);
      if (validationError) return;

      const { name, email, password, role, driverProfile } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email is already registered.' });
      }

      const userData = { name, email, password, role: role || 'user' };
      if (role === 'driver' && driverProfile) {
        userData.driverProfile = driverProfile;
      }

      const user = await User.create(userData);
      const token = user.generateJWT();

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: user.toJSON(),
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ success: false, message: 'Server error during signup.' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const validationError = handleValidation(req, res);
      if (validationError) return;

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = user.generateJWT();
      res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: user.toJSON(),
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }
);

// ─── POST /api/auth/google ───────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { email, name, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required.' });
    }

    const lowerEmail = email.toLowerCase();

    // Search for existing user
    let user = await User.findOne({ email });
    if (user) {
      // If user exists and is a driver, hospital_staff, admin, or superadmin, reject Google Login
      if (['driver', 'hospital_staff', 'admin', 'superadmin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Google Sign-In is only allowed for Citizen/Patient accounts. Staff, Drivers, and Administrators must sign in using their email and password credentials.'
        });
      }
    } else {
      // If user does not exist, check if email corresponds to restricted roles to prevent bypasses
      if (
        lowerEmail.includes('admin') || 
        lowerEmail.includes('staff') || 
        lowerEmail.includes('driver') || 
        lowerEmail.endsWith('@emergency.com')
      ) {
        return res.status(403).json({
          success: false,
          message: 'Google Sign-In is restricted to Citizen/Patient accounts. Administrative, staff, or driver signups cannot be created via Google.'
        });
      }

      // Sign up new user with patient role
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: Math.random().toString(36).slice(-10), // Random password
        role: 'patient',
        avatar: avatar || '',
        healthProfile: {
          bloodGroup: 'Unknown',
          allergies: [],
          medications: [],
          primaryPhone: '',
          chronicConditions: '',
          residentialAddress: '',
          emergencyContacts: [],
          timeline: []
        }
      });
    }

    const isNewUser = !user.lastLogin;

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Send email notification asynchronously (fire-and-forget)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginLink = `${frontendUrl}/login`;
    
    const emailSubject = isNewUser 
      ? '🚨 Welcome to EmergencyAI — Verify Your Medical Profile' 
      : '🔓 Security Alert: Successful Sign-In to EmergencyAI';

    const emailText = isNewUser
      ? `Hello ${user.name},\n\nWelcome to EmergencyAI! Your account was successfully created via Google Sign-In (${email}).\n\nTo ensure emergency dispatchers can coordinate rescue operations and view your medical details (such as blood group, allergies, and emergency contacts) in a crisis, please log in and verify your profile information immediately.\n\nLink to Verify: ${loginLink}\n\nIf you did not create this account, please contact support.\n\nBest regards,\nThe EmergencyAI Security & Rescue Operations Team`
      : `Hello ${user.name},\n\nWe detected a successful sign-in to your EmergencyAI account via Google Sign-In (${email}) at ${new Date().toLocaleString('en-US')}.\n\nTo review or update your health and emergency coordinates, please visit the Citizen Portal.\n\nDashboard Link: ${loginLink}\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nThe EmergencyAI Security Team`;

    const emailHtml = isNewUser
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f0f1a; color: #f8fafc;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #ef4444; padding-bottom: 16px;">
            <h1 style="color: #ef4444; margin: 0; font-size: 26px;">🚨 EmergencyAI</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Real-Time Crisis Response Hub</p>
          </div>
          
          <h2 style="color: #f8fafc; font-size: 20px; border-left: 4px solid #ef4444; padding-left: 10px; margin-bottom: 20px;">Welcome to EmergencyAI, ${user.name}!</h2>
          
          <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
            Your account has been successfully initialized using Google Sign-In (<strong>${email}</strong>) as a <strong>Citizen/Patient</strong>.
          </p>
          
          <div style="background-color: rgba(59,130,246,0.1); border: 1px dashed rgba(59,130,246,0.3); border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h3 style="color: #3b82f6; margin-top: 0; font-size: 15px;">ℹ️ CRITICAL STEP: Profile Verification</h3>
            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
              To allow emergency dispatchers and paramedics to access your life-saving medical dossier (blood type, allergies, medications, and emergency contacts) in a real-time crisis, please verify your details in the citizen panel.
            </p>
            <div style="text-align: center; margin-top: 18px;">
              <a href="${loginLink}" target="_blank" style="background-color: #ef4444; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Verify Information & Login</a>
            </div>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
            This is an automated notification. If you did not create this account, please contact our support team immediately.
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f0f1a; color: #f8fafc;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #ef4444; padding-bottom: 16px;">
            <h1 style="color: #ef4444; margin: 0; font-size: 26px;">🚨 EmergencyAI</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Real-Time Crisis Response Hub</p>
          </div>
          
          <h2 style="color: #f8fafc; font-size: 20px; border-left: 4px solid #ef4444; padding-left: 10px; margin-bottom: 20px;">Successful Google Sign-In</h2>
          
          <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
            Hello ${user.name}, we detected a successful sign-in to your EmergencyAI account via Google (<strong>${email}</strong>).
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #cbd5e1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px; font-weight: bold; color: #94a3b8;">Event:</td>
              <td style="padding: 10px;">Google OAuth2 authentication</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px; font-weight: bold; color: #94a3b8;">Time:</td>
              <td style="padding: 10px;">${new Date().toLocaleString('en-US')}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; color: #94a3b8;">Access Level:</td>
              <td style="padding: 10px; color: #22c55e; font-weight: bold;">Patient/Citizen Portal</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginLink}" target="_blank" style="background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Access Dashboard</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
            If you did not authorize this login, please change your security settings or contact our support team immediately.
          </p>
        </div>
      `;

    sendEmail({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    }).then((resEmail) => {
      if (resEmail.success) {
        console.log(`✉️ Google Auth verification email successfully sent to ${email}`);
      } else {
        console.error(`✉️ Google Auth verification email failed: ${resEmail.error}`);
      }
    });

    const token = user.generateJWT();
    res.json({
      success: true,
      message: 'Google login successful.',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ success: false, message: 'Server error during Google login.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('healthProfile.preferredHospital', 'name address');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowedFields = ['name', 'healthProfile', 'location', 'profilePhoto'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/auth/profile/driver ─────────────────────────────────────────────
router.put('/profile/driver', authenticate, authorize('driver', 'admin'), async (req, res) => {
  try {
    const { vehicleNumber, licenseNumber, currentStatus, currentAmbulance } = req.body;
    const driverProfile = {};
    if (vehicleNumber) driverProfile['driverProfile.vehicleNumber'] = vehicleNumber.toUpperCase();
    if (licenseNumber) driverProfile['driverProfile.licenseNumber'] = licenseNumber.toUpperCase();
    if (currentStatus) driverProfile['driverProfile.currentStatus'] = currentStatus;
    if (currentAmbulance !== undefined) driverProfile['driverProfile.currentAmbulance'] = currentAmbulance;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: driverProfile }, { new: true, runValidators: true });
    res.json({ success: true, message: 'Driver profile updated.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
router.put(
  '/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const validationError = handleValidation(req, res);
      if (validationError) return;

      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(req.body.oldPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Old password is incorrect.' });
      }

      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

// ─── GET /api/auth/users (admin/superadmin only) ──────────────────────────
router.get('/users', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20, includeInactive = 'false' } = req.query;
    const query = {};
    if (includeInactive !== 'true') {
      query.isActive = true;
    }
    if (role) query.role = role;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);

    res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/users/:id (admin/superadmin only) ──────────────────────────
router.get('/users/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('healthProfile.preferredHospital', 'name address');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
});

// ─── PATCH /api/auth/status (admin/superadmin only) ───────────────────────────
router.patch('/status', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { userId, isActive } = req.body;
    if (!userId || isActive === undefined) {
      return res.status(400).json({ success: false, message: 'userId and isActive are required.' });
    }
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: `User status updated to ${isActive ? 'active' : 'inactive'}.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
