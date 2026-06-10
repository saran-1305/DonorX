const express = require('express');
const router = express.Router();
const { getPredictions } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/predictions', protect, asyncHandler(getPredictions));

module.exports = router;
