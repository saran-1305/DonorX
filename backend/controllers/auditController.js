const { AuditLog } = require('../models');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Public
exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: 1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
