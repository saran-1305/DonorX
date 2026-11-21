const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
    {
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyRequest',
            required: false, // May be hospital or inventory action
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            default: null,
            index: true,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        prevHash: {
            type: String,
            required: true, // Blockchain hash chain simulation
        },
        hash: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'auditlogs', // Preserves exact physical collection name
    }
);

AuditLogSchema.index({ requestId: 1, timestamp: -1 });
AuditLogSchema.index({ hospitalId: 1, timestamp: -1 });

module.exports = AuditLogSchema;
