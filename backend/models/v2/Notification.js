const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        type: {
            type: String,
            enum: ['EMERGENCY', 'ACCEPTED', 'CONSULTATION', 'CHAT', 'TRANSPORT', 'SYSTEM'],
            default: 'SYSTEM',
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            default: '',
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: 'notifications', // Preserves exact physical collection name
    }
);

NotificationSchema.index({ hospitalId: 1, read: 1, createdAt: -1 });

module.exports = NotificationSchema;
