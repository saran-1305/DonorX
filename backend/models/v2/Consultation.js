const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema(
    {
        fromHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        toHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        creatorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        subject: {
            type: String,
            default: 'Inter-Hospital Consultation',
            trim: true,
        },
        status: {
            type: String,
            enum: ['OPEN', 'REPLIED', 'CLOSED'],
            default: 'OPEN',
            index: true,
        },
        replies: [
            {
                fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
                responderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                message: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
        collection: 'consultations', // Preserves exact physical collection name
    }
);

ConsultationSchema.index({ fromHospital: 1, toHospital: 1, createdAt: -1 });

module.exports = ConsultationSchema;
