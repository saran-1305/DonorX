const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
    {
        fromHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        toHospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        senderUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        consultationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Consultation',
            default: null,
            index: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        collection: 'chatmessages', // Preserves exact physical collection name
    }
);

ChatMessageSchema.index({ fromHospital: 1, toHospital: 1, createdAt: -1 });

module.exports = ChatMessageSchema;
