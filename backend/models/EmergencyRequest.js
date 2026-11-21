const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.EmergencyRequest || mongoose.model('EmergencyRequest', schemas.EmergencyRequestSchema, 'emergencyrequests');
