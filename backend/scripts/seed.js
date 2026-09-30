require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const Emergency = require('../models/Emergency');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergencyai';

const hospitals = [
  {
    name: 'All India Institute of Medical Sciences',
    address: 'Ansari Nagar East, New Delhi, Delhi 110029',
    location: { lat: 28.5672, lng: 77.2100 },
    phone: '011-26588500',
    email: 'info@aiims.edu',
    type: 'government',
    totalBeds: 2500,
    availableBeds: 180,
    icuBeds: 200,
    availableIcuBeds: 22,
    treatmentTypes: ['trauma', 'cardiac', 'neurology', 'oncology', 'burns', 'pediatrics', 'orthopedics'],
    emergencyLevel: 'level1',
    rating: 4.8,
    established: 1956,
  },
  {
    name: 'King Edward Memorial Hospital',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    location: { lat: 18.9945, lng: 72.8424 },
    phone: '022-24136051',
    email: 'info@kem.edu',
    type: 'government',
    totalBeds: 1800,
    availableBeds: 210,
    icuBeds: 150,
    availableIcuBeds: 18,
    treatmentTypes: ['trauma', 'cardiac', 'obstetrics', 'pediatrics', 'renal', 'respiratory'],
    emergencyLevel: 'level1',
    rating: 4.6,
    established: 1926,
  },
  {
    name: 'Manipal Hospital',
    address: '98, HAL Airport Road, Bangalore, Karnataka 560017',
    location: { lat: 12.9716, lng: 77.6412 },
    phone: '080-25024444',
    email: 'info@manipalhospitals.com',
    type: 'private',
    totalBeds: 700,
    availableBeds: 95,
    icuBeds: 80,
    availableIcuBeds: 12,
    treatmentTypes: ['cardiac', 'neurology', 'orthopedics', 'oncology', 'renal'],
    emergencyLevel: 'level2',
    rating: 4.7,
    established: 1991,
  },
  {
    name: 'Rajiv Gandhi Government General Hospital',
    address: 'Park Town, Chennai, Tamil Nadu 600003',
    location: { lat: 13.0827, lng: 80.2707 },
    phone: '044-25305000',
    email: 'rgggh@tnhealth.org',
    type: 'government',
    totalBeds: 2300,
    availableBeds: 320,
    icuBeds: 120,
    availableIcuBeds: 15,
    treatmentTypes: ['general', 'trauma', 'burns', 'obstetrics', 'pediatrics', 'ENT'],
    emergencyLevel: 'level1',
    rating: 4.3,
    established: 1934,
  },
  {
    name: 'KIMS Hospital',
    address: '1-112/86, Minister Road, Secunderabad, Hyderabad, Telangana 500003',
    location: { lat: 17.4399, lng: 78.4983 },
    phone: '040-44885000',
    email: 'info@kimshospitals.com',
    type: 'private',
    totalBeds: 1000,
    availableBeds: 140,
    icuBeds: 100,
    availableIcuBeds: 20,
    treatmentTypes: ['cardiac', 'neurology', 'trauma', 'oncology', 'orthopedics', 'renal'],
    emergencyLevel: 'level1',
    rating: 4.5,
    established: 2002,
  },
];

const incidentTypes = ['medical', 'accident', 'fire', 'natural_disaster', 'crime'];
const severities = ['low', 'medium', 'high', 'critical'];
const statuses = ['pending', 'assigned', 'in_progress', 'resolved'];
const equipmentLevels = ['basic', 'advanced', 'critical_care'];
const ambulanceStatuses = ['available', 'dispatched', 'on_scene', 'returning', 'maintenance'];

async function seed() {
  console.log('🌱 Seeding EmergencyAI database...');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Ambulance.deleteMany({}),
    Emergency.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Create hospitals
  const createdHospitals = await Hospital.insertMany(hospitals);
  console.log(`🏥 Created ${createdHospitals.length} hospitals`);

  // Create admin user
  await User.create({
    name: 'System Admin AI',
    email: 'admin@emergencyai.com',
    password: 'Admin@123',
    role: 'admin',
  });

  // Documented Admin
  await User.create({
    name: 'System Admin',
    email: 'admin@emergency.com',
    password: 'Admin@123',
    role: 'admin',
  });

  // Documented SuperAdmin
  await User.create({
    name: 'Super Administrator',
    email: 'superadmin@emergency.com',
    password: 'SuperAdmin@123',
    role: 'superadmin',
  });

  // Documented Staff
  await User.create({
    name: 'Medical Staff Operator',
    email: 'staff@emergency.com',
    password: 'Staff@123',
    role: 'hospital_staff',
  });

  console.log('👤 Demo users created successfully in DB');

  // Create driver users
  const driverData = [
    { name: 'Rajesh Kumar', email: 'driver1@emergencyai.com', vehicleNumber: 'DL-01-EA-0001' },
    { name: 'Priya Sharma', email: 'driver2@emergencyai.com', vehicleNumber: 'MH-02-EA-0002' },
    { name: 'Mohammed Ali', email: 'driver3@emergencyai.com', vehicleNumber: 'KA-03-EA-0003' },
    { name: 'Sunita Devi', email: 'driver4@emergencyai.com', vehicleNumber: 'TN-04-EA-0004' },
    { name: 'Vikram Singh', email: 'driver5@emergencyai.com', vehicleNumber: 'TS-05-EA-0005' },
  ];

  const drivers = await User.create(
    driverData.map(d => ({
      name: d.name,
      email: d.email,
      password: 'Driver@123',
      role: 'driver',
      driverProfile: { vehicleNumber: d.vehicleNumber, licenseNumber: `LIC-${uuidv4().slice(0, 8).toUpperCase()}`, currentStatus: 'available' },
    }))
  );
  console.log(`🚗 Created ${drivers.length} driver users (password: Driver@123)`);

  // Create patient user
  await User.create({
    name: 'Test Patient AI',
    email: 'patient@emergencyai.com',
    password: 'Patient@123',
    role: 'patient',
    healthProfile: {
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Aspirin'],
      medications: ['Metformin 500mg'],
      emergencyContacts: [{ name: 'Family Member', phone: '9876543210', relation: 'Spouse' }],
    },
  });

  await User.create({
    name: 'Test Patient',
    email: 'patient@emergency.com',
    password: 'Patient@123',
    role: 'patient',
    healthProfile: {
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Aspirin'],
      medications: ['Metformin 500mg'],
      emergencyContacts: [{ name: 'Family Member', phone: '9876543210', relation: 'Spouse' }],
    },
  });
  console.log('🤒 Test patient created: patient@emergencyai.com & patient@emergency.com / Patient@123');

  // Create ambulances
  const ambulanceData = [];
  for (let i = 0; i < 15; i++) {
    const hospitalIdx = i % createdHospitals.length;
    const hospital = createdHospitals[hospitalIdx];
    const driverIdx = i < drivers.length ? i : null;
    const status = i < 10 ? 'available' : ambulanceStatuses[i % ambulanceStatuses.length];

    // Generate location near hospital
    const lat = hospital.location.lat + (Math.random() - 0.5) * 0.05;
    const lng = hospital.location.lng + (Math.random() - 0.5) * 0.05;

    ambulanceData.push({
      vehicleNumber: `AMB-${String(i + 1).padStart(4, '0')}`,
      registrationNumber: `REG-${uuidv4().slice(0, 8).toUpperCase()}`,
      driver: driverIdx !== null ? drivers[driverIdx]._id : null,
      hospital: hospital._id,
      equipmentLevel: equipmentLevels[i % equipmentLevels.length],
      status,
      currentLocation: { lat, lng, lastUpdated: new Date() },
      specifications: {
        capacity: 2,
        yearOfManufacture: 2018 + (i % 6),
        lastServiced: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        fuelType: i % 3 === 0 ? 'Electric' : 'Diesel',
      },
      totalTrips: Math.floor(Math.random() * 500),
    });
  }

  const ambulances = await Ambulance.insertMany(ambulanceData);
  console.log(`🚑 Created ${ambulances.length} ambulances`);

  // Update drivers with their current ambulance
  for (let i = 0; i < ambulances.length; i++) {
    const amb = ambulances[i];
    if (amb.driver) {
      await User.findByIdAndUpdate(amb.driver, {
        'driverProfile.currentAmbulance': amb._id,
      });
    }
  }

  // Update hospitals with ambulances
  for (let i = 0; i < ambulances.length; i++) {
    const hospitalIdx = i % createdHospitals.length;
    await Hospital.findByIdAndUpdate(createdHospitals[hospitalIdx]._id, {
      $push: { ambulances: ambulances[i]._id },
    });
  }

  // Create sample emergencies
  const samplePatient = await User.create({
    name: 'Sample Reporter',
    email: 'reporter@emergencyai.com',
    password: 'Report@123',
    role: 'patient',
  });

  const emergencyData = [];
  for (let i = 0; i < 25; i++) {
    const hospitalIdx = i % createdHospitals.length;
    const hospital = createdHospitals[hospitalIdx];
    const type = incidentTypes[i % incidentTypes.length];
    const severity = severities[i % severities.length];
    const status = statuses[i % statuses.length];
    const lat = hospital.location.lat + (Math.random() - 0.5) * 0.1;
    const lng = hospital.location.lng + (Math.random() - 0.5) * 0.1;
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const em = {
      reportedBy: samplePatient._id,
      incidentType: type,
      location: { lat, lng, address: `Sample Location ${i + 1}` },
      severity,
      status,
      victimCount: Math.floor(Math.random() * 5) + 1,
      description: `Sample ${type} incident #${i + 1} for testing purposes.`,
      aiPrediction: {
        severity,
        confidence: 0.7 + Math.random() * 0.3,
        recommendation: 'Dispatch appropriate medical unit.',
        predictedAt: createdAt,
      },
      createdAt,
    };

    if (status !== 'pending') {
      em.assignedAmbulance = ambulances[i % ambulances.length]._id;
      em.assignedHospital = hospital._id;
      em.respondedAt = new Date(createdAt.getTime() + Math.random() * 15 * 60 * 1000);
    }
    if (status === 'resolved') {
      em.resolvedAt = new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000);
    }

    emergencyData.push(em);
  }

  await Emergency.insertMany(emergencyData);
  console.log(`🆘 Created ${emergencyData.length} sample emergencies`);

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Admin:   admin@emergencyai.com / Admin@123');
  console.log('🤒 Patient: patient@emergencyai.com / Patient@123');
  console.log('🚗 Drivers: driver1-5@emergencyai.com / Driver@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
