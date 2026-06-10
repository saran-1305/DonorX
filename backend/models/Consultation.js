const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema({
    fromHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true,
    },
    toHospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: String,
        default: 'Inter-Hospital Consultation',
    },
    status: {
        type: String,
        enum: ['OPEN', 'REPLIED', 'CLOSED'],
        default: 'OPEN',
    },
    replies: [{
        fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        message: String,
        createdAt: { type: Date, default: Date.now },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Consultation', ConsultationSchema);
