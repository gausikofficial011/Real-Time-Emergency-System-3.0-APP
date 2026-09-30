const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MedicalScheme = require('../models/MedicalScheme');

dotenv.config({ path: path.join(__dirname, '../.env') });

const schemes = [
  // --- Central ---
  {
    name: "Ayushman Bharat PM-JAY",
    description: "The world's largest health insurance scheme providing cashless cover of Rs. 5 lakh per family per year for secondary and tertiary care hospitalization.",
    benefits: ["Cashless treatment up to 5 Lakhs", "Pre-existing diseases covered from day 1", "Covers 3 days pre & 15 days post hospitalization costs"],
    eligibility: "Based on SECC 2011 data and all senior citizens aged 70+",
    state: "Central",
    category: "Insurance",
    officialLink: "https://nha.gov.in/PM-JAY",
    launchedYear: 2018,
    documentsRequired: ["Aadhaar Card", "Ration Card", "PM-JAY Card"]
  },
  {
    name: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)",
    description: "A scheme to provide quality generic medicines at affordable prices through devoted outlets known as Jan Aushadhi Kendras.",
    benefits: ["Availability of quality generic medicines", "50% to 90% savings compared to branded drugs"],
    eligibility: "Open to all Indian citizens",
    state: "Central",
    category: "Subsidy",
    officialLink: "http://janaushadhi.gov.in/",
    launchedYear: 2008,
    documentsRequired: ["Prescription from a registered medical practitioner"]
  },
  {
    name: "National Rare Disease Policy 2021",
    description: "Policy to provide financial support for patients suffering from rare diseases.",
    benefits: ["One-time financial support up to Rs. 50 Lakhs", "Support at Centres of Excellence"],
    eligibility: "Patients with rare diseases listed in Group 1, 2, and 3",
    state: "Central",
    category: "Financial Assistance",
    officialLink: "https://main.mohfw.gov.in/",
    launchedYear: 2021,
    documentsRequired: ["Medical Diagnosis Report", "Income Certificate", "Aadhaar Card"]
  },

  // --- Rajasthan ---
  {
    name: "Mukhyamantri Chiranjeevi Health Insurance Scheme",
    description: "A comprehensive health insurance scheme for all residents of Rajasthan providing high-value coverage.",
    benefits: ["Health insurance up to Rs. 25 Lakhs per family", "Accident cover of Rs. 10 Lakhs"],
    eligibility: "All families residing in Rajasthan",
    state: "Rajasthan",
    category: "Insurance",
    officialLink: "https://chiranjeevi.rajasthan.gov.in/",
    launchedYear: 2021,
    documentsRequired: ["Jan Aadhaar Card", "Aadhaar Card", "Ration Card"]
  },

  // --- Odisha ---
  {
    name: "Biju Swasthya Kalyan Yojana (BSKY)",
    description: "State government initiative to provide universal health coverage to the people of Odisha.",
    benefits: ["Cashless treatment up to Rs. 5 Lakhs", "Special provision of Rs. 10 Lakhs for women members"],
    eligibility: "All families using Ration Cards (NFSA/SFSS) in Odisha",
    state: "Odisha",
    category: "Insurance",
    officialLink: "https://bsky.odisha.gov.in/",
    launchedYear: 2018,
    documentsRequired: ["BSKY Smart Card", "NFSA/SFSS Ration Card"]
  },

  // --- Telangana ---
  {
    name: "Aarogyasri Scheme (Telangana)",
    description: "A unique Community Health Insurance Scheme being implemented in Telangana for poor families.",
    benefits: ["Financial protection to families for 949 identified treatments", "Cashless services in government and private hospitals"],
    eligibility: "BPL families who are residents of Telangana",
    state: "Telangana",
    category: "Insurance",
    officialLink: "https://www.aarogyasri.telangana.gov.in/",
    launchedYear: 2007,
    documentsRequired: ["Aarogyasri Health Card", "Aadhaar Card"]
  },

  // --- Assam ---
  {
    name: "Atal Amrit Abhiyan",
    description: "A unique health insurance scheme launched by the Assam government for low income families.",
    benefits: ["Cover of Rs. 2 Lakhs per individual annually", "Includes cardiovascular, renal and cancer treatments"],
    eligibility: "Families with income less than Rs. 5 Lakhs in Assam",
    state: "Assam",
    category: "Insurance",
    officialLink: "https://aaa-assam.in/",
    launchedYear: 2016,
    documentsRequired: ["Atal Amrit Abhiyan Smart Card", "Income Certificate"]
  },

  // --- Bihar ---
  {
    name: "Mukhyamantri Chikitsa Sahayata Kosh (Bihar)",
    description: "Provides financial aid to citizens for treatment of serious ailments.",
    benefits: ["Financial aid for 14 types of critical diseases", "Direct transfer to hospital accounts"],
    eligibility: "Permanent residents of Bihar with annual income below specified limit",
    state: "Bihar",
    category: "Financial Assistance",
    officialLink: "http://health.bih.nic.in/",
    launchedYear: 2010,
    documentsRequired: ["Aadhaar Card", "BPL Ration Card", "Medical Estimate from Hospital"]
  },

  // --- Haryana ---
  {
    name: "Ayushman Bharat-Haryana Health Protection Authority",
    description: "Implementation of PM-JAY in Haryana with added state benefits.",
    benefits: ["Cashless treatment up to 5 Lakhs", "Increased coverage of procedures"],
    eligibility: "SECC data and families with income up to Rs. 1.80 Lakhs (CHIRAYU Haryana)",
    state: "Haryana",
    category: "Insurance",
    officialLink: "https://ayushmanharyana.gov.in/",
    launchedYear: 2018,
    documentsRequired: ["Parivar Pehchan Patra (PPP)", "Aadhaar Card"]
  },

  // --- Madhya Pradesh ---
  {
    name: "Ayushman Madhya Pradesh",
    description: "State-led implementation of National Health Protection Mission.",
    benefits: ["Free treatment up to 5 Lakhs in empanelled hospitals", "Special cancer care packages"],
    eligibility: "SECC-2011 identified families in Madhya Pradesh",
    state: "Madhya Pradesh",
    category: "Insurance",
    officialLink: "http://www.ayushmanupchar.mp.gov.in/",
    launchedYear: 2018,
    documentsRequired: ["Aadhaar Card", "Samagra ID", "Ration Card"]
  },

  // --- Karnataka ---
  {
    name: "Ayushman Bharat-Arogya Karnataka (AB-ArK)",
    description: "Integrated health insurance scheme for the residents of Karnataka.",
    benefits: ["Tertiary care up to 5 Lakhs for BPL", "Fixed rate benefits for APL families"],
    eligibility: "Residents of Karnataka with PDS/Aadhaar",
    state: "Karnataka",
    category: "Insurance",
    officialLink: "https://arogya.karnataka.gov.in/",
    launchedYear: 2018,
    documentsRequired: ["Aadhaar Card", "Ration Card (BPL/APL)"]
  },

  // --- Maharashtra ---
  {
    name: "Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY)",
    description: "Flagship health scheme of Govt of Maharashtra for identified diseases.",
    benefits: ["Cashless service up to 1.5 Lakhs per year", "Includes renal transplant, heart surgeries"],
    eligibility: "Residents of Maharashtra holding Yellow/Orange Ration cards",
    state: "Maharashtra",
    category: "Insurance",
    officialLink: "https://www.jeevandayee.gov.in/",
    launchedYear: 2012,
    documentsRequired: ["Ration Card (Yellow/Orange)", "Aadhaar Card", "Voter ID"]
  },

  // --- West Bengal ---
  {
    name: "Swasthya Sathi",
    description: "Health cover for secondary and tertiary care for the entire population of WB.",
    benefits: ["Cashless basic health cover up to 5 Lakhs", "Smart card recorded transactions"],
    eligibility: "All citizens of West Bengal not covered under any other health scheme",
    state: "West Bengal",
    category: "Insurance",
    officialLink: "https://swasthyasathi.gov.in/",
    launchedYear: 2016,
    documentsRequired: ["Swasthya Sathi Smart Card", "Aadhaar Card"]
  },

  // --- Tamil Nadu ---
  {
    name: "Chief Minister’s Comprehensive Health Insurance Scheme (CMCHIS)",
    description: "High-end medical and surgical treatment for low income families in TN.",
    benefits: ["Cashless treatment up to 5 Lakhs per year", "Covers 1027 procedures"],
    eligibility: "Families with annual income < 1.2 Lakhs in Tamil Nadu",
    state: "Tamil Nadu",
    category: "Insurance",
    officialLink: "https://www.cmchistn.com/",
    launchedYear: 2012,
    documentsRequired: ["CMCHIS Card", "Smart Ration Card", "Income Certificate"]
  },

  // --- Andhra Pradesh ---
  {
    name: "Dr. YSR Aarogyasri",
    description: "Pioneer health insurance scheme for poor families in AP.",
    benefits: ["Treatment for 2434 procedures", "Includes cancer and heart surgeries", "Post-op follow up charges covered"],
    eligibility: "Annual income below Rs. 5 Lakhs and resident of AP",
    state: "Andhra Pradesh",
    category: "Insurance",
    officialLink: "http://www.aarogyasri.ap.gov.in/",
    launchedYear: 2007,
    documentsRequired: ["Aarogyasri Health Card", "Aadhaar Card", "PDS Card"]
  },

  // --- Gujarat ---
  {
    name: "Mukhyamantri Amrutum (MA) Yojana",
    description: "Tertiary care cover for BPL families in Gujarat.",
    benefits: ["Coverage for 600+ critical illnesses", "Transport assistance of Rs. 300 per visit"],
    eligibility: "Families whose total annual income is less than Rs. 4 Lakhs",
    state: "Gujarat",
    category: "Insurance",
    officialLink: "https://magujarat.com/",
    launchedYear: 2012,
    documentsRequired: ["MA Yojana Card", "Income Certificate"]
  },

  // --- Kerala ---
  {
    name: "Karunya Arogya Suraksha Padhathi (KASP)",
    description: "Comprehensive healthcare scheme for families in Kerala.",
    benefits: ["Cashless treatment for nearly 1600 procedures", "Special oncology and dialysis packages"],
    eligibility: "Families as per NFSA and SECC data in Kerala",
    state: "Kerala",
    category: "Insurance",
    officialLink: "https://sha.kerala.gov.in/",
    launchedYear: 2018,
    documentsRequired: ["KASP Card", "Aadhaar Card"]
  },

  // --- Delhi ---
  {
    name: "Delhi Arogya Kosh (DAK)",
    description: "Financial assistance to needy residents of Delhi for treatments.",
    benefits: ["Covers expenses for heart, kidney transplants and cancer", "Free diagnostic tests at private labs via DAK"],
    eligibility: "Residents of Delhi for 3 years, low income",
    state: "Delhi",
    category: "Financial Assistance",
    officialLink: "https://delhiarogyakosh.delhi.gov.in/",
    launchedYear: 2011,
    documentsRequired: ["Delhi Residence Proof (3 yrs)", "Voter ID", "Aadhaar"]
  },

  // --- Punjab ---
  {
    name: "Ayushman Bharat Mukh Mantri Sehat Bima Yojana",
    description: "Universal health insurance for people of Punjab.",
    benefits: ["Nearly 1600 medical and surgical treatment cover", "Cashless tertiary care"],
    eligibility: "Smart Ration Card holders, farmers under J-form",
    state: "Punjab",
    category: "Insurance",
    officialLink: "https://sha.punjab.gov.in/",
    launchedYear: 2019,
    documentsRequired: ["Smart Ration Card", "Aadhaar Card"]
  },

  // --- Uttar Pradesh ---
  {
    name: "Mukhyamantri Jan Arogya Yojana (UP)",
    description: "Supplementary scheme by UP govt to PM-JAY.",
    benefits: ["Rs. 5 Lakhs cover for families not in SECC list", "Cashless treatment in govt/pvt hospitals"],
    eligibility: "BPL families in UP not covered under PM-JAY",
    state: "Uttar Pradesh",
    category: "Insurance",
    officialLink: "https://ayushmanup.in/",
    launchedYear: 2019,
    documentsRequired: ["Aadhaar Card", "Ration Card", "Identity Proof"]
  },

  // --- Himachal Pradesh ---
  {
    name: "Himcare Scheme",
    description: "Health insurance for residents of HP not covered by Ayushman Bharat.",
    benefits: ["Cashless treatment up to 5 Lakhs per year", "Covers day care procedures"],
    eligibility: "All residents of HP who are not govt employees",
    state: "Himachal Pradesh",
    category: "Insurance",
    officialLink: "https://hpsha.in/",
    launchedYear: 2019,
    documentsRequired: ["Himcare Card", "Aadhaar Card", "Ration Card"]
  },

  // --- Uttarakhand ---
  {
    name: "Atal Ayushman Uttarakhand Yojana",
    description: "Health cover for all inhabitants of Uttarakhand.",
    benefits: ["Universal health cover up to 5 Lakhs", "Integrated with Golden Card benefits"],
    eligibility: "All families residing in Uttarakhand",
    state: "Uttarakhand",
    category: "Insurance",
    officialLink: "https://ayushmanuttarakhand.org/",
    launchedYear: 2018,
    documentsRequired: ["Golden Card", "Aadhaar Card", "Ration Card"]
  },

  // --- Chhattisgarh ---
  {
    name: "Dr. Khubchand Baghel Swasthya Sahayata Yojana",
    description: "Unified healthcare scheme for the residents of Chhattisgarh.",
    benefits: ["Treatment up to 5 Lakhs for BPL", "Up to Rs. 50,000 for APL families"],
    eligibility: "Ration Card holders of Chhattisgarh",
    state: "Chhattisgarh",
    category: "Insurance",
    officialLink: "https://dkbssy.cg.nic.in/",
    launchedYear: 2019,
    documentsRequired: ["Ration Card (Chhattisgarh)", "Aadhaar Card"]
  },

  // --- Jharkhand ---
  {
    name: "Ayushman Bharat Mukhyamantri Jan Arogya Yojana",
    description: "Expanded version of PM-JAY for Jharkhand residents.",
    benefits: ["5 Lakhs cover per family", "Special kidney care and cardiac surgery packages"],
    eligibility: "Red/Green Ration card holders in Jharkhand",
    state: "Jharkhand",
    category: "Insurance",
    officialLink: "https://ayushmanjharkhand.in/",
    launchedYear: 2019,
    documentsRequired: ["Ration Card", "Aadhaar Card"]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await MedicalScheme.deleteMany({});
    console.log('🗑️  Cleared old schemes');

    await MedicalScheme.insertMany(schemes);
    console.log(`🚀 Successfully seeded ${schemes.length} detailed Indian Medical Schemes!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
