/**
 * Validation Helper Functions
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number
 */
const isValidPhoneNumber = (phone) => {
  // Basic validation: 10-15 digits
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Validate positive number
 */
const isPositiveNumber = (value) => {
  return !Number.isNaN(value) && value > 0;
};

/**
 * Validate integer
 */
const isInteger = (value) => {
  return Number.isInteger(value);
};

/**
 * Validate string is non-empty
 */
const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validate URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate UUID
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate array of valid items
 */
const isValidArray = (arr, minLength = 0, maxLength = null) => {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLength) return false;
  if (maxLength !== null && arr.length > maxLength) return false;
  return true;
};

module.exports = {
  isValidEmail,
  isValidPhoneNumber,
  isPositiveNumber,
  isInteger,
  isNonEmptyString,
  isValidUrl,
  isValidUUID,
  isValidArray,
};
