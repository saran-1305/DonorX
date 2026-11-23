const express = require('express');
const router = express.Router();
const {
    getBills,
    getBillByRequestId,
    getBillById,
    generateBill,
    updateRate,
    complete,
    terminate,
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', protect, asyncHandler(getBills));
router.get('/request/:requestId', protect, asyncHandler(getBillByRequestId));
router.get('/:id', protect, asyncHandler(getBillById));
router.post('/generate', protect, asyncHandler(generateBill));
router.put('/:id/rate', protect, asyncHandler(updateRate));
router.put('/:id/complete', protect, asyncHandler(complete));
router.put('/:id/terminate', protect, asyncHandler(terminate));

module.exports = router;
