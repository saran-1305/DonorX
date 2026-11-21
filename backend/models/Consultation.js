const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.Consultation || mongoose.model('Consultation', schemas.ConsultationSchema, 'consultations');
