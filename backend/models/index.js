const mongoose = require('mongoose');
const { schemas } = require('./v2');
const BillSchema = require('./v2/Bill');

// Compile or retrieve from the default mongoose connection
const getModel = (name, schema, collection) => {
    return mongoose.models[name] || mongoose.model(name, schema, collection);
};

module.exports = {
    Hospital: getModel('Hospital', schemas.HospitalSchema, 'hospitals'),
    User: getModel('User', schemas.UserSchema, 'users'),
    BloodInventory: getModel('BloodInventory', schemas.BloodInventorySchema, 'blood_inventories'),
    ResourceInventory: getModel('ResourceInventory', schemas.ResourceInventorySchema, 'resource_inventories'),
    OrganInventory: getModel('OrganInventory', schemas.OrganInventorySchema, 'organ_inventories'),
    EmergencyRequest: getModel('EmergencyRequest', schemas.EmergencyRequestSchema, 'emergencyrequests'),
    ResourceMatch: getModel('ResourceMatch', schemas.ResourceMatchSchema, 'resource_matches'),
    Ambulance: getModel('Ambulance', schemas.AmbulanceSchema, 'ambulances'),
    Delivery: getModel('Delivery', schemas.DeliverySchema, 'deliveries'),
    TransportTracking: getModel('TransportTracking', schemas.TransportTrackingSchema, 'transporttrackings'),
    Notification: getModel('Notification', schemas.NotificationSchema, 'notifications'),
    ChatMessage: getModel('ChatMessage', schemas.ChatMessageSchema, 'chatmessages'),
    Consultation: getModel('Consultation', schemas.ConsultationSchema, 'consultations'),
    AuditLog: getModel('AuditLog', schemas.AuditLogSchema, 'auditlogs'),
    MedicalReport: getModel('MedicalReport', schemas.MedicalReportSchema, 'medical_reports'),
    AIInsight: getModel('AIInsight', schemas.AIInsightSchema, 'ai_insights'),
    Bill: getModel('Bill', BillSchema, 'bills'),
};
