const mongoose = require('mongoose');

const BloodInventorySchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            required: true,
        },
        component: {
            type: String,
            enum: ['WHOLE_BLOOD', 'PRBC', 'FFP', 'PLATELETS', 'CRYOPRECIPITATE', 'GENERAL'],
            default: 'WHOLE_BLOOD',
        },
        unitsAvailable: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        unitsReserved: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        unitsTotal: {
            type: Number,
            default: function () {
                return (this.unitsAvailable || 0) + (this.unitsReserved || 0);
            },
            min: 0,
        },
    },
    {
        timestamps: true,
        collection: 'blood_inventories',
    }
);

// Unique compound index: one stock record per bloodGroup & component per hospital
BloodInventorySchema.index({ hospitalId: 1, bloodGroup: 1, component: 1 }, { unique: true });
BloodInventorySchema.index({ bloodGroup: 1, unitsAvailable: 1 });

module.exports = BloodInventorySchema;
