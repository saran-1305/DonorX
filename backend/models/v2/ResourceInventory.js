const mongoose = require('mongoose');

const ResourceInventorySchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        resourceType: {
            type: String,
            enum: ['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE', 'DIALYSIS_MACHINE', 'PPE_KIT'],
            required: true,
        },
        total: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        available: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        reserved: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        collection: 'resource_inventories',
    }
);

// One inventory record per resourceType per hospital
ResourceInventorySchema.index({ hospitalId: 1, resourceType: 1 }, { unique: true });
ResourceInventorySchema.index({ resourceType: 1, available: 1 });

module.exports = ResourceInventorySchema;
