require('dotenv').config();
const mongoose = require('mongoose');
const { InsurancePolicy } = require('../models/Insurance');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergencyai';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all patient/user roles
    const users = await User.find({ role: { $in: ['patient', 'user'] } });
    if (users.length === 0) {
      console.log('❌ No users found with role "patient" or "user" to attach policies to. Please run npm run seed first.');
      process.exit(1);
    }

    await InsurancePolicy.deleteMany({});
    console.log('🗑️  Cleared old policies');

    const allPolicies = [];
    users.forEach(user => {
      allPolicies.push(
        {
          userId: user._id,
          policyNumber: `HLT-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          policyName: "Star Health Premier",
          type: "health",
          provider: "Star Health & Allied Insurance",
          sumInsured: 1000000,
          premium: 12500,
          startDate: new Date("2024-01-15"),
          endDate: new Date("2027-01-14"),
          status: "active"
        },
        {
          userId: user._id,
          policyNumber: `LIFE-99-TRM-${Math.floor(100 + Math.random() * 900)}`,
          policyName: "iTerm Plus Protection",
          type: "life",
          provider: "HDFC Life Insurance",
          sumInsured: 5000000,
          premium: 8500,
          startDate: new Date("2023-11-20"),
          endDate: new Date("2028-11-19"),
          status: "active"
        }
      );
    });

    await InsurancePolicy.insertMany(allPolicies);
    console.log(`🚀 Successfully seeded ${allPolicies.length} Mock Insurance Policies across ${users.length} users.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
