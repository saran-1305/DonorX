const express = require('express');
const router = express.Router();
const { getHospitalNetwork, getHospitalById } = require('../controllers/hospitalController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/network', protect, asyncHandler(getHospitalNetwork));
router.get('/:id', protect, asyncHandler(getHospitalById));

module.exports = router;
