// Function to validate Chilean RUT
function validateRUT(rut) {
  // Basic format check
  if (!/^[\d\.]+-[\dkK]$/i.test(rut)) return false;

  // Remove dots and hyphen, convert to uppercase
  const cleanedRUT = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();

  // Separate number and verification digit
  const number = cleanedRUT.slice(0, -1);
  const dv = cleanedRUT.slice(-1);

  // Calculate the expected verification digit
  let sum = 0;
  let multiplier = 2;

  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const calculatedDV = 11 - (sum % 11);
  const expectedDV =
    calculatedDV === 11
      ? "0"
      : calculatedDV === 10
      ? "K"
      : calculatedDV.toString();

  return dv === expectedDV;
}

module.exports = validateRUT;
