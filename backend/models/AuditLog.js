const mongoose = require('mongoose');
const { schemas } = require('./v2');

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', schemas.AuditLogSchema, 'auditlogs');
