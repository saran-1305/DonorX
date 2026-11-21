const mongoose = require('mongoose');
const {
    normalizeCoordinates,
    transformHospital,
    transformEmergencyRequest,
    transformTransportTracking,
    transformNotification,
    transformAuditLog,
} = require('../transformers');
const { runMigration } = require('../orchestrator');
const { validateMigration } = require('../validator');

describe('DonorX v2 Migration ETL & Safety Tests', () => {
    let mockSourceConn;
    let mockDestConn;

    const sampleRawHospital = {
        _id: new mongoose.Types.ObjectId('6af9e916d36e404d16b08fbb'),
        name: 'Apollo Main Hospital',
        email: 'apollo@donorx.com',
        password: '$2b$10$hashedpasswordstringforadmin',
        contactPhone: '+91 98401 23456',
        contactPerson: 'Dr. Ramesh Kumar',
        address: '21 Greams Lane, Chennai',
        location: {
            type: 'Point',
            coordinates: [80.2514, 13.0604],
        },
        inventory: [
            { _id: new mongoose.Types.ObjectId('6af9ee544a7e9e1e36b22fa2'), type: 'BLOOD', group: 'O+', quantity: 15 },
            { _id: new mongoose.Types.ObjectId('6af9ee544a7e9e1e36b22fa4'), type: 'BLOOD', group: 'A+', quantity: 10 },
            { _id: new mongoose.Types.ObjectId('6af9ee544a7e9e1e36b22fa8'), type: 'ORGAN', group: 'Kidney', quantity: 1 },
        ],
        resources: [
            { _id: new mongoose.Types.ObjectId('6af9ee544a7e9e1e36b22faa'), resourceType: 'ICU_BED', available: 8, total: 15 },
            { _id: new mongoose.Types.ObjectId('6af9ee544a7e9e1e36b22fab'), resourceType: 'VENTILATOR', available: 5, total: 8 },
        ],
        createdAt: new Date('2026-11-15T17:17:10.683Z'),
    };

    const sampleRawRequest = {
        _id: new mongoose.Types.ObjectId('6af9e8e61dbab9eec6f6ecba'),
        patientName: 'John Doe',
        urgency: 'High',
        condition: 'Trauma',
        resourceNeeded: {
            resourceCategory: 'BLOOD',
            type: 'BLOOD',
            group: 'A+',
            quantity: 2,
        },
        requestingHospital: new mongoose.Types.ObjectId('6af9e916d36e404d16b08fbb'),
        location: {
            type: 'Point',
            coordinates: [80.25, 13.05],
        },
        status: 'Pending',
        priorityScore: 50,
        searchRadius: 15,
        createdAt: new Date('2026-11-15T17:16:22.702Z'),
    };

    it('normalizes GeoJSON coordinates correctly', () => {
        expect(normalizeCoordinates([80.25, 13.05])).toEqual([80.25, 13.05]);
        // Invalid falls back safely
        expect(normalizeCoordinates(null)).toEqual([80.25, 13.05]);
        expect(normalizeCoordinates(['invalid', 'coords'])).toEqual([80.25, 13.05]);
    });

    it('transforms hospital into 1 facility, 1 user, and discrete inventories', () => {
        const transformed = transformHospital(sampleRawHospital);

        // Hospital facility
        expect(transformed.cleanedHospital._id).toEqual(sampleRawHospital._id);
        expect(transformed.cleanedHospital.name).toBe('Apollo Main Hospital');
        expect(transformed.cleanedHospital.email).toBe('apollo@donorx.com');

        // Admin User
        expect(transformed.adminUser.hospitalId).toEqual(sampleRawHospital._id);
        expect(transformed.adminUser.email).toBe('apollo@donorx.com');
        expect(transformed.adminUser.role).toBe('HOSPITAL_ADMIN');
        expect(transformed.adminUser.password).toBe(sampleRawHospital.password);

        // Blood inventories
        expect(transformed.bloodInventories.length).toBe(2);
        expect(transformed.bloodInventories[0].bloodGroup).toBe('O+');
        expect(transformed.bloodInventories[0].unitsAvailable).toBe(15);
        expect(transformed.bloodInventories[1].bloodGroup).toBe('A+');
        expect(transformed.bloodInventories[1].unitsAvailable).toBe(10);

        // Organ inventories
        expect(transformed.organInventories.length).toBe(1);
        expect(transformed.organInventories[0].organType).toBe('KIDNEY');
        expect(transformed.organInventories[0].status).toBe('REQUIRES_CLINICAL_REVIEW');

        // Resource inventories
        expect(transformed.resourceInventories.length).toBe(2);
        expect(transformed.resourceInventories[0].resourceType).toBe('ICU_BED');
        expect(transformed.resourceInventories[0].available).toBe(8);
        expect(transformed.resourceInventories[0].total).toBe(15);
    });

    it('transforms emergency request and preserves ID and casing', () => {
        const transformed = transformEmergencyRequest(sampleRawRequest);
        expect(transformed._id).toEqual(sampleRawRequest._id);
        expect(transformed.patientName).toBe('John Doe');
        expect(transformed.status).toBe('Pending'); // Preserves exact casing
        expect(transformed.resourceNeeded.group).toBe('A+');
        expect(transformed.resourceNeeded.quantity).toBe(2);
        expect(transformed.searchRadius).toBe(15);
    });

    it('tests end-to-end migration idempotency on isolated mock database', async () => {
        // Connect to isolated in-memory or temporary test DBs
        const testSourceConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/donorx_test_src_iso').asPromise();
        const testDestConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/donorx_test_dst_iso').asPromise();

        try {
            await testSourceConn.db.dropDatabase();
            await testDestConn.db.dropDatabase();

            // Seed mock source data
            await testSourceConn.db.collection('hospitals').insertOne(sampleRawHospital);
            await testSourceConn.db.collection('emergencyrequests').insertOne(sampleRawRequest);

            // Run migration pass 1
            const pass1 = await runMigration(testSourceConn, testDestConn);
            expect(pass1.counts.hospitals.migrated).toBe(1);
            expect(pass1.counts.users.migrated).toBe(1);
            expect(pass1.counts.bloodInventories.migrated).toBe(2);
            expect(pass1.counts.emergencyRequests.migrated).toBe(1);

            // Run validation
            const val1 = await validateMigration(testSourceConn, testDestConn);
            expect(val1.overallValid).toBe(true);
            expect(val1.inventoryReconciliation.bloodUnits.reconciled).toBe(true);
            expect(val1.inventoryReconciliation.bloodUnits.dest).toBe(25); // 15 + 10

            // Run migration pass 2 (RERUN / IDEMPOTENCY TEST)
            const pass2 = await runMigration(testSourceConn, testDestConn);
            expect(pass2.counts.hospitals.migrated).toBe(1);

            // Re-validate: counts should not double!
            const val2 = await validateMigration(testSourceConn, testDestConn);
            expect(val2.overallValid).toBe(true);
            expect(val2.collectionCounts.hospitals.dest).toBe(1);
            expect(val2.collectionCounts.users.created).toBe(1);
            expect(val2.collectionCounts.bloodInventories.dest).toBe(2);
            expect(val2.inventoryReconciliation.bloodUnits.dest).toBe(25); // Still 25, no duplication!
        } finally {
            await testSourceConn.db.dropDatabase();
            await testDestConn.db.dropDatabase();
            await testSourceConn.close();
            await testDestConn.close();
        }
    });
});
