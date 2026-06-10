const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
} = require('../services/notificationService');

exports.listNotifications = async (req, res) => {
    const notifications = await getNotifications(req.user._id);
    const unreadCount = await getUnreadCount(req.user._id);
    res.json({ notifications, unreadCount });
};

exports.markRead = async (req, res) => {
    const notification = await markAsRead(req.params.id, req.user._id);
    if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
};

exports.markAllRead = async (req, res) => {
    await markAllAsRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
};
