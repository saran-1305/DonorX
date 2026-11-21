const mongoose = require('mongoose');

const AIInsightSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['INVENTORY_PREDICTION', 'OUTBREAK_RISK', 'RESOURCE_OPTIMIZATION', 'CLINICAL_ALERT'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        insightText: {
            type: String,
            required: true,
        },
        confidenceScore: {
            type: Number,
            default: 0.0,
            min: 0,
            max: 1,
        },
        actionableRecommendations: [
            {
                type: String,
            },
        ],
        acknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'ai_insights',
    }
);

AIInsightSchema.index({ hospitalId: 1, type: 1, createdAt: -1 });

module.exports = AIInsightSchema;
