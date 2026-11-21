const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.TransportTracking || mongoose.model('TransportTracking', schemas.TransportTrackingSchema, 'transporttrackings');
