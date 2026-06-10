const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['EMERGENCY', 'ACCEPTED', 'CONSULTATION', 'CHAT', 'TRANSPORT', 'SYSTEM'],
        default: 'SYSTEM',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
