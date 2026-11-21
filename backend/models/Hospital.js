const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', schemas.HospitalSchema, 'hospitals');
