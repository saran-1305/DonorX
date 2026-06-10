const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
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
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

ChatMessageSchema.index({ fromHospital: 1, toHospital: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
