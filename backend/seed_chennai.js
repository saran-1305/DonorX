const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Hospital = require('./models/Hospital');

const hospitalsData = [
  {
    name: 'Apollo Main Hospital',
    email: 'admin@donorx.com',
    contactPerson: 'Dr. Ramesh Kumar',
    contactPhone: '+91 98401 23456',
    address: '21 Greams Lane, Thousand Lights, Chennai',
    location: { type: 'Point', coordinates: [80.2514, 13.0604] },
    inventory: [
      { type: 'BLOOD', group: 'O+', quantity: 15 },
      { type: 'BLOOD', group: 'O-', quantity: 6 },
      { type: 'BLOOD', group: 'A+', quantity: 12 },
      { type: 'BLOOD', group: 'A-', quantity: 4 },
      { type: 'BLOOD', group: 'B+', quantity: 10 },
      { type: 'BLOOD', group: 'AB+', quantity: 5 },
      { type: 'ORGAN', group: 'Kidney', quantity: 2 },
      { type: 'ORGAN', group: 'Liver', quantity: 1 }
    ],
    resources: [
      { resourceType: 'ICU_BED', available: 8, total: 15 },
      { resourceType: 'VENTILATOR', available: 5, total: 8 },
      { resourceType: 'OXYGEN_CYLINDER', available: 30, total: 40 },
      { resourceType: 'AMBULANCE', available: 4, total: 6 }
    ]
  },
  {
    name: 'Kauvery Hospital',
    email: 'kauvery@donorx.com',
    contactPerson: 'Dr. Priya Sridhar',
    contactPhone: '+91 98402 34567',
    address: '199 Luz Church Road, Alwarpet, Chennai',
    location: { type: 'Point', coordinates: [80.2505, 13.0368] },
    inventory: [
      { type: 'BLOOD', group: 'O+', quantity: 8 },
      { type: 'BLOOD', group: 'A+', quantity: 10 },
      { type: 'BLOOD', group: 'B+', quantity: 8 },
      { type: 'BLOOD', group: 'B-', quantity: 3 },
      { type: 'ORGAN', group: 'Kidney', quantity: 1 }
    ],
    resources: [
      { resourceType: 'ICU_BED', available: 4, total: 10 },
      { resourceType: 'VENTILATOR', available: 3, total: 5 },
      { resourceType: 'OXYGEN_CYLINDER', available: 20, total: 25 },
      { resourceType: 'AMBULANCE', available: 2, total: 4 }
    ]
  },
  {
    name: 'Fortis Malar Hospital',
    email: 'fortis@donorx.com',
    contactPerson: 'Dr. Arvind Nathan',
    contactPhone: '+91 98403 45678',
    address: '52 1st Main Rd, Gandhi Nagar, Adyar, Chennai',
    location: { type: 'Point', coordinates: [80.2575, 13.0067] },
    inventory: [
      { type: 'BLOOD', group: 'O+', quantity: 12 },
      { type: 'BLOOD', group: 'O-', quantity: 5 },
      { type: 'BLOOD', group: 'AB+', quantity: 4 },
      { type: 'BLOOD', group: 'AB-', quantity: 2 },
      { type: 'ORGAN', group: 'Heart', quantity: 1 },
      { type: 'ORGAN', group: 'Liver', quantity: 1 }
    ],
    resources: [
      { resourceType: 'ICU_BED', available: 6, total: 12 },
      { resourceType: 'VENTILATOR', available: 4, total: 6 },
      { resourceType: 'OXYGEN_CYLINDER', available: 25, total: 35 },
      { resourceType: 'AMBULANCE', available: 3, total: 5 }
    ]
  },
  {
    name: 'MIOT International Hospital',
    email: 'miot@donorx.com',
    contactPerson: 'Dr. Suresh Varma',
    contactPhone: '+91 98404 56789',
    address: '4/112 Mount Poonamallee Rd, Manapakkam, Chennai',
    location: { type: 'Point', coordinates: [80.1837, 13.0234] },
    inventory: [
      { type: 'BLOOD', group: 'O+', quantity: 14 },
      { type: 'BLOOD', group: 'A+', quantity: 9 },
      { type: 'BLOOD', group: 'B+', quantity: 11 },
      { type: 'BLOOD', group: 'O-', quantity: 4 },
      { type: 'ORGAN', group: 'Kidney', quantity: 2 }
    ],
    resources: [
      { resourceType: 'ICU_BED', available: 10, total: 20 },
      { resourceType: 'VENTILATOR', available: 6, total: 10 },
      { resourceType: 'OXYGEN_CYLINDER', available: 40, total: 50 },
      { resourceType: 'AMBULANCE', available: 5, total: 8 }
    ]
  },
  {
    name: 'Rajiv Gandhi Govt General Hospital',
    email: 'rgggh@donorx.com',
    contactPerson: 'Dr. K. Balaji',
    contactPhone: '+91 98405 67890',
    address: 'EVR Periyar Salai, Park Town, Chennai',
    location: { type: 'Point', coordinates: [80.2775, 13.0805] },
    inventory: [
      { type: 'BLOOD', group: 'O+', quantity: 25 },
      { type: 'BLOOD', group: 'O-', quantity: 10 },
      { type: 'BLOOD', group: 'A+', quantity: 20 },
      { type: 'BLOOD', group: 'A-', quantity: 8 },
      { type: 'BLOOD', group: 'B+', quantity: 22 },
      { type: 'BLOOD', group: 'B-', quantity: 6 },
      { type: 'BLOOD', group: 'AB+', quantity: 10 },
      { type: 'BLOOD', group: 'AB-', quantity: 4 }
    ],
    resources: [
      { resourceType: 'ICU_BED', available: 15, total: 30 },
      { resourceType: 'VENTILATOR', available: 10, total: 18 },
      { resourceType: 'OXYGEN_CYLINDER', available: 60, total: 80 },
      { resourceType: 'AMBULANCE', available: 8, total: 12 }
    ]
  }
];

mongoose.connect('mongodb://127.0.0.1:27017/donorx').then(async () => {
  console.log('Connected to local MongoDB');
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  for (const h of hospitalsData) {
    await Hospital.findOneAndUpdate(
      { email: h.email },
      { ...h, password },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted hospital:', h.name);
  }

  // Remove the old dummy hospitals with coordinates [0, 0]
  await Hospital.deleteMany({ email: { $in: ['h1@test.com', 'h2@test.com', 'req@test.com'] } });
  try {
    await Hospital.collection.createIndex({ location: '2dsphere' });
  } catch (e) {
    // index might already exist
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
