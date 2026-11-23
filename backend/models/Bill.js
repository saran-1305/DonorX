const mongoose = require('mongoose');
const BillSchema = require('./v2/Bill');

module.exports = mongoose.models.Bill || mongoose.model('Bill', BillSchema, 'bills');
