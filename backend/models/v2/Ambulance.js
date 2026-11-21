const mongoose = require('mongoose');

const AmbulanceSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        vehicleNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['BASIC', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT', 'NEONATAL'],
            default: 'ADVANCED_LIFE_SUPPORT',
        },
        driverName: {
            type: String,
            default: '',
        },
        driverPhone: {
            type: String,
            default: '',
        },
        isAvailable: {
            type: Boolean,
            default: true,
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
    },
    {
        timestamps: true,
        collection: 'ambulances',
    }
);

AmbulanceSchema.index({ currentLocation: '2dsphere' });
AmbulanceSchema.index({ hospitalId: 1, isAvailable: 1 });

module.exports = AmbulanceSchema;
