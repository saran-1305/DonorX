const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.ChatMessage || mongoose.model('ChatMessage', schemas.ChatMessageSchema, 'chatmessages');
