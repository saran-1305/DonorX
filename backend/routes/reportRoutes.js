const express = require('express');
const multer = require('multer');
const textract = require('textract');
const { parseTextToRequest } = require('../services/requestNlpService');

const router = express.Router();

// Use memory storage so we don't persist uploaded reports to disk.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});

// POST /api/reports/parse
// Accepts a medical report file, extracts text and returns suggested request details.
router.post('/parse', upload.single('report'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const isPlainText =
        (req.file.mimetype && req.file.mimetype.startsWith('text/')) ||
        (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.txt'));

    // Fast-path for Notepad / .txt and other text files
    if (isPlainText) {
        const text = req.file.buffer.toString('utf8');
        const parsed = parseTextToRequest(text || '');
        return res.json({
            rawText: text,
            parsed,
        });
    }

    // Use textract for rich formats (PDF, Word, etc.) based on file name.
    textract.fromBufferWithName(req.file.originalname, req.file.buffer, (err, text) => {
        if (err) {
            console.error('Failed to extract text from report:', err);
            // Graceful fallback: return empty parsed object instead of hard error
            return res.json({
                rawText: '',
                parsed: {},
            });
        }

        const parsed = parseTextToRequest(text || '');
        return res.json({
            rawText: text,
            parsed,
        });
    });
});

module.exports = router;

