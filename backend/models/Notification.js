const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.Notification || mongoose.model('Notification', schemas.NotificationSchema, 'notifications');
