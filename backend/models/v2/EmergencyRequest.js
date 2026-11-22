const mongoose = require('mongoose');

const ResourceNeededSchema = new mongoose.Schema({
    resourceCategory: {
        type: String,
        enum: ['BLOOD', 'ORGAN', 'RESOURCE'],
        default: 'BLOOD',
    },
    type: {
        type: String,
        required: true,
    },
    group: {
        type: String,
        default: '',
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
    },
});

const EmergencyRequestSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        patientName: {
            type: String,
            required: true,
            trim: true,
        },
        urgency: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            required: true,
        },
        condition: {
            type: String,
            required: true,
            trim: true,
        },
        resourceNeeded: {
            type: ResourceNeededSchema,
            required: true,
        },
        requestingHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
                required: true,
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        status: {
            type: String,
            enum: ['Generated', 'Pending', 'Completed', 'Ended', 'Cancelled'],
            default: 'Generated',
            index: true,
        },
        priorityScore: {
            type: Number,
            default: 0,
        },
        searchRadius: {
            type: Number,
            default: 5, // km
        },
        iteration: {
            type: Number,
            default: 1,
        },
        maxIterations: {
            type: Number,
            default: 8, // 5km to 40km (8 iterations of 5km increments)
        },
        potentialMatches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Hospital',
            },
        ],
        notifiedHospitals: [
            {
                hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
                iteration: Number,
                distanceKm: Number,
                notifiedAt: { type: Date, default: Date.now },
            },
        ],
        rejectedHospitals: [
            {
                hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
                reason: { type: String, default: '' },
                rejectedAt: { type: Date, default: Date.now },
            },
        ],
        assignedHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            default: null,
            index: true,
        },
        reservedInventoryId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        aiSummary: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
        collection: 'emergencyrequests',
    }
);

EmergencyRequestSchema.index({ location: '2dsphere' });
EmergencyRequestSchema.index({ status: 1, createdAt: -1 });
EmergencyRequestSchema.index({ requestingHospital: 1, status: 1 });

module.exports = EmergencyRequestSchema;
