// models/DeliveryCostRange.js
const mongoose = require('mongoose');

const deliveryCostRangeSchema = new mongoose.Schema({
  minTotal: { type: Number, required: true },
  maxTotal: { type: Number, required: true },
  costo: { type: Number, required: true },
});

const DeliveryCostRange = mongoose.model('CostoEnvio', deliveryCostRangeSchema);

module.exports = DeliveryCostRange;