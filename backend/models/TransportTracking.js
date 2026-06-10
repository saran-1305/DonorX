const mongoose = require('mongoose');

const TransportTrackingSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmergencyRequest',
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
        default: 'DISPATCHED',
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
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TransportTracking', TransportTrackingSchema);
