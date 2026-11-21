const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema(
    {
        deliveryId: {
            type: String,
            unique: true,
            default: () => 'DEL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        },
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyRequest',
            required: true,
        },
        fromHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        toHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        ambulanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ambulance',
            default: null,
        },
        status: {
            type: String,
            enum: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
            default: 'ASSIGNED',
        },
        dispatchedAt: {
            type: Date,
            default: Date.now,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'deliveries',
    }
);

DeliverySchema.index({ requestId: 1 });
DeliverySchema.index({ fromHospital: 1, toHospital: 1, status: 1 });

module.exports = DeliverySchema;
