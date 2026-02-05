const express = require('express');
const { Router } = express;

// Reuse the same smart text parser used for medical reports
const { parseTextToRequest } = require('../services/requestNlpService');

const router = Router();

// POST /api/voice/parse
// Body: { transcript: string }
router.post('/parse', (req, res) => {
    const { transcript } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        return res.status(400).json({ message: 'Transcript is required' });
    }

    const parsed = parseTextToRequest(transcript);
    return res.json({ parsed });
});

module.exports = router;

