const mongoose = require('mongoose');

const MedicalReportSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        patientName: {
            type: String,
            default: '',
        },
        reportText: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            default: '',
        },
        extractedData: {
            patientName: String,
            bloodGroup: String,
            organNeeded: String,
            urgency: String,
            condition: String,
        },
        aiAnalysis: {
            possibleConditions: [String],
            recommendedTests: [String],
            riskLevel: {
                type: String,
                enum: ['Low', 'Medium', 'High', 'Critical', 'Unknown'],
                default: 'Unknown',
            },
            clinicalNote: { type: String, default: '' },
        },
    },
    {
        timestamps: true,
        collection: 'medical_reports',
    }
);

MedicalReportSchema.index({ hospitalId: 1, createdAt: -1 });

module.exports = MedicalReportSchema;
