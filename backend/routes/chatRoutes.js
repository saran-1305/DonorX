const express = require('express');
const router = express.Router();
const {
    getConversations,
    getUnreadCount,
    getConversation,
    sendMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/conversations', protect, asyncHandler(getConversations));
router.get('/unread-count', protect, asyncHandler(getUnreadCount));
router.get('/:hospitalId', protect, asyncHandler(getConversation));
router.post('/:hospitalId', protect, asyncHandler(sendMessage));

module.exports = router;
