const mongoose = require('mongoose');

const ResourceMatchSchema = new mongoose.Schema(
    {
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyRequest',
            required: true,
        },
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        iteration: {
            type: Number,
            required: true,
            default: 1,
        },
        distanceKm: {
            type: Number,
            required: true,
            default: 0,
        },
        matchedStock: {
            inventoryType: {
                type: String,
                enum: ['BLOOD', 'ORGAN', 'RESOURCE'],
                required: true,
            },
            inventoryId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            quantityAvailable: {
                type: Number,
                default: 0,
            },
        },
        notificationStatus: {
            type: String,
            enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'],
            default: 'SENT',
        },
        responseStatus: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
            default: 'PENDING',
        },
        responseTimestamp: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'resource_matches',
    }
);

ResourceMatchSchema.index({ requestId: 1, hospitalId: 1 }, { unique: true });
ResourceMatchSchema.index({ hospitalId: 1, responseStatus: 1 });

module.exports = ResourceMatchSchema;
