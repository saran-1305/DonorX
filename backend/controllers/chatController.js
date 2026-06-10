const ChatMessage = require('../models/ChatMessage');
const Hospital = require('../models/Hospital');
const { createNotification } = require('../services/notificationService');
const { getIO } = require('../socket');

exports.getConversation = async (req, res) => {
    const partnerId = req.params.hospitalId;
    const myId = req.user._id;

    const messages = await ChatMessage.find({
        $or: [
            { fromHospital: myId, toHospital: partnerId },
            { fromHospital: partnerId, toHospital: myId },
        ],
    })
        .sort({ createdAt: 1 })
        .populate('fromHospital', 'name')
        .lean();

    await ChatMessage.updateMany(
        { fromHospital: partnerId, toHospital: myId, read: false },
        { read: true }
    );

    res.json(messages);
};

exports.sendMessage = async (req, res) => {
    const { message } = req.body;
    const partnerId = req.params.hospitalId;

    if (!message?.trim()) {
        return res.status(400).json({ message: 'Message is required' });
    }

    const partner = await Hospital.findById(partnerId).select('name');
    if (!partner) {
        return res.status(404).json({ message: 'Hospital not found' });
    }

    const chatMessage = await ChatMessage.create({
        fromHospital: req.user._id,
        toHospital: partnerId,
        message: message.trim(),
    });

    const populated = await ChatMessage.findById(chatMessage._id)
        .populate('fromHospital', 'name email contactPhone')
        .populate('toHospital', 'name email contactPhone');

    const io = getIO();
    if (io) {
        io.to(String(partnerId)).emit('chat_message', populated);
    }

    await createNotification(partnerId, {
        type: 'CHAT',
        title: 'New message',
        message: `${req.user.name}: ${message.trim().slice(0, 80)}`,
        link: `/social?hospital=${partnerId}`,
        metadata: { fromHospitalId: req.user._id },
    });

    res.status(201).json(populated);
};
