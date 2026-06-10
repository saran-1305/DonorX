const express = require('express');
const router = express.Router();
const { createConsultation, getMyConsultations, replyToConsultation } = require('../controllers/consultationController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/', protect, asyncHandler(createConsultation));
router.get('/my', protect, asyncHandler(getMyConsultations));
router.post('/:id/reply', protect, asyncHandler(replyToConsultation));

module.exports = router;
