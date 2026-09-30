const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const samplePosts = (superadminId) => [
  {
    title: 'First-Aid Blueprint',
    content: 'Vital instructions for bleeding control, burns treatment, and spinal safety stabilization.',
    type: 'announcement',
    severity: 'info',
    createdBy: superadminId,
  },
  {
    title: 'Cardio CPR Protocol',
    content: 'Step-by-step guidance for cardiopulmonary resuscitation (CPR) chest compressions and rates.',
    type: 'announcement',
    severity: 'warning',
    createdBy: superadminId,
  },
  {
    title: 'Heat Wave Advisories',
    content: 'Government emergency warnings and advice on preventing heat exhaustion and dehydration.',
    type: 'emergency_alert',
    severity: 'critical',
    createdBy: superadminId,
  },
  {
    title: 'Cardiac Surgery Fund for Baby Ayaan',
    content: 'Emergency fundraiser for open heart surgery required for a 6-month old child. Medical files are attached and verified by AIIMS.',
    type: 'fundraiser',
    severity: 'info',
    targetAmount: 500000,
    currentAmount: 150000,
    patientName: 'Baby Ayaan',
    hospitalName: 'AIIMS Delhi',
    createdBy: superadminId,
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const superadmin = await User.findOne({ role: 'superadmin' });
    if (!superadmin) {
      console.log('❌ Superadmin user not found, seed standard admin users first!');
      process.exit(1);
    }

    await Post.deleteMany({});
    console.log('🗑️  Cleared old posts');

    await Post.insertMany(samplePosts(superadmin._id));
    console.log('🚀 Successfully seeded bulletin posts!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
