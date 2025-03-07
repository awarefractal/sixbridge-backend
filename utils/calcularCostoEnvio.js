// utils/calculateDeliveryCost.js
const DeliveryCostRange = require('../models/CostoEnvio');

async function calculateDeliveryCost(purchaseTotal) {
  // Find the range that matches the purchase total
  const range = await DeliveryCostRange.findOne({
    minTotal: { $lte: purchaseTotal },
    maxTotal: { $gte: purchaseTotal },
  });

  // Return the delivery cost if a range is found, otherwise return 0
  return range ? range.costo : 0;
}

module.exports = calculateDeliveryCost;