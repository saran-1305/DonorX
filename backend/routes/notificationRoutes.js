const express = require('express');
const router = express.Router();
const { listNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', protect, asyncHandler(listNotifications));
router.put('/read-all', protect, asyncHandler(markAllRead));
router.put('/:id/read', protect, asyncHandler(markRead));

module.exports = router;
