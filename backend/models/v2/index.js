const HospitalSchema = require('./Hospital');
const UserSchema = require('./User');
const BloodInventorySchema = require('./BloodInventory');
const ResourceInventorySchema = require('./ResourceInventory');
const OrganInventorySchema = require('./OrganInventory');
const EmergencyRequestSchema = require('./EmergencyRequest');
const ResourceMatchSchema = require('./ResourceMatch');
const AmbulanceSchema = require('./Ambulance');
const DeliverySchema = require('./Delivery');
const TransportTrackingSchema = require('./TransportTracking');
const NotificationSchema = require('./Notification');
const ChatMessageSchema = require('./ChatMessage');
const ConsultationSchema = require('./Consultation');
const AuditLogSchema = require('./AuditLog');
const MedicalReportSchema = require('./MedicalReport');
const AIInsightSchema = require('./AIInsight');

/**
 * Creates and binds Mongoose models to a specific connection (e.g. donorx_v2)
 * without polluting or binding to the default mongoose connection or original database.
 */
function initV2Models(connection) {
    return {
        Hospital: connection.model('Hospital', HospitalSchema, 'hospitals'),
        User: connection.model('User', UserSchema, 'users'),
        BloodInventory: connection.model('BloodInventory', BloodInventorySchema, 'blood_inventories'),
        ResourceInventory: connection.model('ResourceInventory', ResourceInventorySchema, 'resource_inventories'),
        OrganInventory: connection.model('OrganInventory', OrganInventorySchema, 'organ_inventories'),
        EmergencyRequest: connection.model('EmergencyRequest', EmergencyRequestSchema, 'emergencyrequests'),
        ResourceMatch: connection.model('ResourceMatch', ResourceMatchSchema, 'resource_matches'),
        Ambulance: connection.model('Ambulance', AmbulanceSchema, 'ambulances'),
        Delivery: connection.model('Delivery', DeliverySchema, 'deliveries'),
        TransportTracking: connection.model('TransportTracking', TransportTrackingSchema, 'transporttrackings'),
        Notification: connection.model('Notification', NotificationSchema, 'notifications'),
        ChatMessage: connection.model('ChatMessage', ChatMessageSchema, 'chatmessages'),
        Consultation: connection.model('Consultation', ConsultationSchema, 'consultations'),
        AuditLog: connection.model('AuditLog', AuditLogSchema, 'auditlogs'),
        MedicalReport: connection.model('MedicalReport', MedicalReportSchema, 'medical_reports'),
        AIInsight: connection.model('AIInsight', AIInsightSchema, 'ai_insights'),
    };
}

module.exports = {
    schemas: {
        HospitalSchema,
        UserSchema,
        BloodInventorySchema,
        ResourceInventorySchema,
        OrganInventorySchema,
        EmergencyRequestSchema,
        ResourceMatchSchema,
        AmbulanceSchema,
        DeliverySchema,
        TransportTrackingSchema,
        NotificationSchema,
        ChatMessageSchema,
        ConsultationSchema,
        AuditLogSchema,
        MedicalReportSchema,
        AIInsightSchema,
    },
    initV2Models,
};
