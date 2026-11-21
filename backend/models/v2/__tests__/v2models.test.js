const mongoose = require('mongoose');
const { schemas, initV2Models } = require('../index');

describe('DonorX v2 Models & Schemas Validation', () => {
    let mockConn;

    beforeAll(() => {
        // Create an isolated, unattached connection to test model compilation
        mockConn = mongoose.createConnection();
    });

    afterAll(async () => {
        if (mockConn) {
            await mockConn.close();
        }
    });

    it('exports all 16 required schemas', () => {
        expect(Object.keys(schemas).length).toBe(16);
        expect(schemas.HospitalSchema).toBeDefined();
        expect(schemas.UserSchema).toBeDefined();
        expect(schemas.BloodInventorySchema).toBeDefined();
        expect(schemas.ResourceInventorySchema).toBeDefined();
        expect(schemas.OrganInventorySchema).toBeDefined();
        expect(schemas.EmergencyRequestSchema).toBeDefined();
        expect(schemas.ResourceMatchSchema).toBeDefined();
        expect(schemas.AmbulanceSchema).toBeDefined();
        expect(schemas.DeliverySchema).toBeDefined();
        expect(schemas.TransportTrackingSchema).toBeDefined();
        expect(schemas.NotificationSchema).toBeDefined();
        expect(schemas.ChatMessageSchema).toBeDefined();
        expect(schemas.ConsultationSchema).toBeDefined();
        expect(schemas.AuditLogSchema).toBeDefined();
        expect(schemas.MedicalReportSchema).toBeDefined();
        expect(schemas.AIInsightSchema).toBeDefined();
    });

    it('compiles all 16 models on a dedicated connection without errors', () => {
        const models = initV2Models(mockConn);
        expect(Object.keys(models).length).toBe(16);

        expect(models.Hospital.collection.name).toBe('hospitals');
        expect(models.User.collection.name).toBe('users');
        expect(models.BloodInventory.collection.name).toBe('blood_inventories');
        expect(models.ResourceInventory.collection.name).toBe('resource_inventories');
        expect(models.OrganInventory.collection.name).toBe('organ_inventories');
        expect(models.EmergencyRequest.collection.name).toBe('emergencyrequests');
        expect(models.ResourceMatch.collection.name).toBe('resource_matches');
        expect(models.Ambulance.collection.name).toBe('ambulances');
        expect(models.Delivery.collection.name).toBe('deliveries');
        expect(models.TransportTracking.collection.name).toBe('transporttrackings');
        expect(models.Notification.collection.name).toBe('notifications');
        expect(models.ChatMessage.collection.name).toBe('chatmessages');
        expect(models.Consultation.collection.name).toBe('consultations');
        expect(models.AuditLog.collection.name).toBe('auditlogs');
        expect(models.MedicalReport.collection.name).toBe('medical_reports');
        expect(models.AIInsight.collection.name).toBe('ai_insights');
    });

    it('preserves exact physical collection names for existing collections', () => {
        const models = initV2Models(mockConn);
        expect(models.Hospital.collection.name).toBe('hospitals');
        expect(models.EmergencyRequest.collection.name).toBe('emergencyrequests');
        expect(models.TransportTracking.collection.name).toBe('transporttrackings');
        expect(models.Notification.collection.name).toBe('notifications');
        expect(models.ChatMessage.collection.name).toBe('chatmessages');
        expect(models.Consultation.collection.name).toBe('consultations');
        expect(models.AuditLog.collection.name).toBe('auditlogs');
    });

    it('verifies GeoJSON Point and 2dsphere index configurations', () => {
        const hospitalIndexes = schemas.HospitalSchema.indexes();
        const has2dsphere = hospitalIndexes.some(idx => idx[0] && idx[0].location === '2dsphere');
        expect(has2dsphere).toBe(true);

        const requestIndexes = schemas.EmergencyRequestSchema.indexes();
        const req2dsphere = requestIndexes.some(idx => idx[0] && idx[0].location === '2dsphere');
        expect(req2dsphere).toBe(true);
    });

    it('verifies BloodInventory compound unique index', () => {
        const bloodIndexes = schemas.BloodInventorySchema.indexes();
        const uniqueCompound = bloodIndexes.find(
            idx => idx[0] && idx[0].hospitalId === 1 && idx[0].bloodGroup === 1 && idx[0].component === 1
        );
        expect(uniqueCompound).toBeDefined();
        expect(uniqueCompound[1].unique).toBe(true);
    });

    it('verifies User email uniqueness index', () => {
        const userIndexes = schemas.UserSchema.indexes();
        const emailUnique = userIndexes.find(idx => idx[0] && idx[0].email === 1);
        expect(emailUnique).toBeDefined();
        expect(emailUnique[1].unique).toBe(true);
    });
});
