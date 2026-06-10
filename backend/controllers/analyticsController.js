const { getPredictiveAnalytics } = require('../services/analyticsService');

exports.getPredictions = async (req, res) => {
    try {
        const data = await getPredictiveAnalytics();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
