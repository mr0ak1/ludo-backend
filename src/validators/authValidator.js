const Joi = require('joi');

// Phone number validation (international format)
const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number in international format',
    'any.required': 'Phone number is required',
  });

// Email validation
const emailSchema = Joi.string()
  .email()
  .lowercase()
  .messages({
    'string.email': 'Please provide a valid email address',
  });

// OTP validation
const otpSchema = Joi.string()
  .pattern(/^\d{4,8}$/)
  .required()
  .messages({
    'string.pattern.base': 'OTP must be 4 to 8 digits',
    'any.required': 'OTP is required',
    'string.empty': 'OTP cannot be empty',
  });

// Name validation
const nameSchema = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-Z0-9\s\-']+$/)
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'string.pattern.base': 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes',
  });

// Avatar URL validation
const avatarSchema = Joi.string()
  .uri()
  .messages({
    'string.uri': 'Avatar must be a valid URL',
  });

/**
 * Validate send OTP request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateSendOtp = (data) => {
  const schema = Joi.object({
    phone: phoneSchema,
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate OTP verification request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateVerifyOtp = (data) => {
  const schema = Joi.object({
    phone: phoneSchema,
    otp: otpSchema,
    sessionId: Joi.string().optional(),
    deviceToken: Joi.string().optional(),
    referralCode: Joi.string().trim().uppercase().optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate refresh token request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateRefreshToken = (data) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
      'string.empty': 'Refresh token cannot be empty',
    }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate logout request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateLogout = (data) => {
  const schema = Joi.object({
    deviceToken: Joi.string().optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate profile update request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateUpdateProfile = (data) => {
  const schema = Joi.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    avatar: avatarSchema.optional(),
    phone: phoneSchema.optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate delete account request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateDeleteAccount = (data) => {
  const schema = Joi.object({
    password: Joi.string().optional(), // Optional for now, can be required for security
    reason: Joi.string().max(500).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Format validation errors into readable messages
 * @param {Object} error - Joi validation error
 * @returns {Object} Formatted errors
 */
const formatValidationErrors = (error) => {
  const errors = {};
  if (error.details) {
    error.details.forEach(detail => {
      const field = detail.path.join('.');
      errors[field] = detail.message;
    });
  }
  return errors;
};

module.exports = {
  validateSendOtp,
  validateVerifyOtp,
  validateRefreshToken,
  validateLogout,
  validateUpdateProfile,
  validateDeleteAccount,
  formatValidationErrors,
  // Export schemas for reuse
  phoneSchema,
  emailSchema,
  otpSchema,
  nameSchema,
  avatarSchema,
};
