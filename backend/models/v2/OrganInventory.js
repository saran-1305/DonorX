const mongoose = require('mongoose');

const OrganInventorySchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        organType: {
            type: String,
            enum: ['KIDNEY', 'LIVER', 'HEART', 'LUNGS', 'PANCREAS', 'CORNEA', 'INTESTINE'],
            required: true,
        },
        donorBloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            required: true,
        },
        donorAge: {
            type: Number,
            default: null,
        },
        harvestedAt: {
            type: Date,
            default: null,
        },
        ischemiaDeadline: {
            type: Date,
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ['AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'TRANSPLANTED', 'NON_VIABLE', 'REQUIRES_CLINICAL_REVIEW'],
            default: 'REQUIRES_CLINICAL_REVIEW',
            index: true,
        },
        crossmatchDetails: {
            hlaTyping: { type: String, default: '' },
            serology: { type: String, default: '' },
            tissueCompatibility: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        clinicalClearance: {
            clearedBy: { type: String, default: null },
            clearedAt: { type: Date, default: null },
            regulatoryRefNumber: { type: String, default: null },
        },
        discardReason: {
            type: String,
            default: null,
        },
        discardLoggedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'organ_inventories',
    }
);

OrganInventorySchema.index({ hospitalId: 1, organType: 1 });
OrganInventorySchema.index({ status: 1, ischemiaDeadline: 1 });

module.exports = OrganInventorySchema;
