const ChatMessage = require('../models/ChatMessage');
const Hospital = require('../models/Hospital');
const { createNotification } = require('../services/notificationService');
const { getIO } = require('../socket');

const partnerFromMessage = (msg, myId) => {
    const fromId = String(msg.fromHospital?._id || msg.fromHospital);
    return fromId === String(myId) ? msg.toHospital : msg.fromHospital;
};

exports.getConversations = async (req, res) => {
    const myId = req.user._id;

    const messages = await ChatMessage.find({
        $or: [{ fromHospital: myId }, { toHospital: myId }],
    })
        .sort({ createdAt: -1 })
        .populate('fromHospital', 'name email')
        .populate('toHospital', 'name email')
        .lean();

    const seen = new Set();
    const conversations = [];

    for (const msg of messages) {
        const partner = partnerFromMessage(msg, myId);
        const partnerId = String(partner._id || partner);
        if (seen.has(partnerId)) continue;
        seen.add(partnerId);

        const unreadCount = await ChatMessage.countDocuments({
            fromHospital: partnerId,
            toHospital: myId,
            read: false,
        });

        conversations.push({
            partner,
            lastMessage: msg,
            unreadCount,
        });
    }

    res.json(conversations);
};

exports.getUnreadCount = async (req, res) => {
    const count = await ChatMessage.countDocuments({
        toHospital: req.user._id,
        read: false,
    });
    res.json({ count });
};

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
        .populate('toHospital', 'name')
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
        io.to(String(req.user._id)).emit('chat_message', populated);
    }

    await createNotification(partnerId, {
        type: 'CHAT',
        title: 'New message',
        message: `${req.user.name}: ${message.trim().slice(0, 80)}`,
        link: `/messages?hospital=${req.user._id}`,
        metadata: { fromHospitalId: req.user._id, fromHospitalName: req.user.name },
    });

    res.status(201).json(populated);
};
