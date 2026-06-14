const Joi = require('joi');
const { CHAT_LIMITS } = require('../constants/chat.constants');

const mongoId = Joi.alternatives().try(
  Joi.number().integer().min(1),
  Joi.string().hex().length(16),
  Joi.string().hex().length(24)
).required().messages({
  'any.required': 'Id is required',
  'any.unknown': 'Invalid id format',
});

const validateSendMessageBody = (body) =>
  Joi.object({
    message: Joi.string().trim().min(CHAT_LIMITS.MIN_MESSAGE_LENGTH).max(CHAT_LIMITS.MAX_MESSAGE_LENGTH).required(),
    playerName: Joi.string().trim().max(80).optional().allow(''),
  }).validate(body, { abortEarly: false, stripUnknown: true });

const validateChatHistoryQuery = (query) =>
  Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }).validate(query, { abortEarly: false, stripUnknown: true });

const validateGameIdParam = (params) =>
  Joi.object({
    gameId: mongoId,
  }).validate(params, { abortEarly: false, stripUnknown: true });

const formatValidationErrors = (error) =>
  error.details.map((d) => ({
    field: d.path.join('.'),
    message: d.message,
  }));

module.exports = {
  validateSendMessageBody,
  validateChatHistoryQuery,
  validateGameIdParam,
  formatValidationErrors,
};
