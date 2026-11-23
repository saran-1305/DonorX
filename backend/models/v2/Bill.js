const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            unique: true,
            required: true,
            index: true,
        },
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyRequest',
            required: true,
            index: true,
        },
        requestingHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        providingHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        patientName: {
            type: String,
            required: true,
            trim: true,
        },
        condition: {
            type: String,
            default: '',
        },
        urgency: {
            type: String,
            default: 'Medium',
        },
        resourceCategory: {
            type: String,
            enum: ['BLOOD', 'ORGAN', 'RESOURCE'],
            default: 'BLOOD',
        },
        resourceType: {
            type: String,
            required: true,
        },
        resourceGroup: {
            type: String,
            default: '',
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        unitRate: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        resourceTotal: {
            type: Number,
            required: true,
            default: 0,
        },
        distanceKm: {
            type: Number,
            default: 0,
        },
        transportBaseFee: {
            type: Number,
            default: 500,
        },
        transportRatePerKm: {
            type: Number,
            default: 40,
        },
        transportTotal: {
            type: Number,
            required: true,
            default: 500,
        },
        subtotal: {
            type: Number,
            required: true,
            default: 0,
        },
        commissionRate: {
            type: Number,
            default: 0.05, // 5% DonorX commission
        },
        commissionAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        status: {
            type: String,
            enum: ['Active', 'Pending', 'Completed', 'Terminated'],
            default: 'Active',
            index: true,
        },
        rateFixedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            default: null,
        },
        rateFixedAt: {
            type: Date,
            default: null,
        },
        actionByHospitalA: {
            action: {
                type: String,
                enum: ['None', 'Completed', 'Terminated'],
                default: 'None',
            },
            actedAt: { type: Date, default: null },
            note: { type: String, default: '' },
        },
        actionByHospitalB: {
            action: {
                type: String,
                enum: ['None', 'Completed', 'Terminated'],
                default: 'None',
            },
            actedAt: { type: Date, default: null },
            note: { type: String, default: '' },
        },
        completedAt: {
            type: Date,
            default: null,
        },
        terminatedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
        collection: 'bills',
    }
);

BillSchema.index({ requestingHospital: 1, status: 1 });
BillSchema.index({ providingHospital: 1, status: 1 });

module.exports = BillSchema;
