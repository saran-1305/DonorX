const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const HospitalSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: String,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            sparse: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            default: '',
        },
        contactPhone: {
            type: String,
            default: '',
        },
        contactPerson: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: ['Hospital', 'Blood Bank', 'Organ Center', 'Trauma Center', 'Clinic', 'General'],
            default: 'Hospital',
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
        inventory: {
            type: Array,
            default: [],
        },
        resources: {
            type: Array,
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'hospitals',
    }
);

HospitalSchema.index({ location: '2dsphere' });

HospitalSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = HospitalSchema;
