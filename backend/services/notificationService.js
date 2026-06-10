const Notification = require('../models/Notification');
const { getIO } = require('../socket');

exports.createNotification = async (hospitalId, { type, title, message, link, metadata }) => {
    const notification = await Notification.create({
        hospitalId,
        type: type || 'SYSTEM',
        title,
        message,
        link: link || '',
        metadata: metadata || {},
    });

    const io = getIO();
    if (io) {
        io.to(String(hospitalId)).emit('notification', notification);
    }

    return notification;
};

exports.getNotifications = async (hospitalId, limit = 30) => {
    return Notification.find({ hospitalId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

exports.markAsRead = async (notificationId, hospitalId) => {
    return Notification.findOneAndUpdate(
        { _id: notificationId, hospitalId },
        { read: true },
        { new: true }
    );
};

exports.markAllAsRead = async (hospitalId) => {
    await Notification.updateMany({ hospitalId, read: false }, { read: true });
};

exports.getUnreadCount = async (hospitalId) => {
    return Notification.countDocuments({ hospitalId, read: false });
};
