const express = require('express');
const router = express.Router();
const { getDrivingRoute } = require('../controllers/routeController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/driving', protect, asyncHandler(getDrivingRoute));

module.exports = router;
