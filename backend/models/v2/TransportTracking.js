const mongoose = require('mongoose');

const TransportTrackingSchema = new mongoose.Schema(
    {
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyRequest',
            required: true,
        },
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Delivery',
            default: null,
        },
        status: {
            type: String,
            enum: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
            default: 'DISPATCHED',
            index: true,
        },
        origin: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: 'Source Hospital' },
        },
        destination: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: 'Patient Location' },
        },
        currentPosition: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        currentLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
        route: [
            {
                lat: Number,
                lng: Number,
                timestamp: { type: Date, default: Date.now },
            },
        ],
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        etaMinutes: {
            type: Number,
            default: 0,
        },
        distanceKm: {
            type: Number,
            default: 0,
        },
        resourceLabel: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
        collection: 'transporttrackings', // Preserves exact physical collection name
    }
);

TransportTrackingSchema.index({ currentLocation: '2dsphere' });
TransportTrackingSchema.index({ requestId: 1 }, { unique: true });

module.exports = TransportTrackingSchema;
