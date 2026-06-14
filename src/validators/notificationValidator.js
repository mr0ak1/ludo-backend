const Joi = require('joi');
const { NOTIFICATION_LIST_DEFAULTS } = require('../constants/notification.constants');

const mongoId = Joi.alternatives().try(
  Joi.number().integer().min(1),
  Joi.string().hex().length(16),
  Joi.string().hex().length(24)
).required().messages({
  'any.required': 'Id is required',
  'any.unknown': 'Invalid id format',
});

const validateNotificationListQuery = (query) =>
  Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(NOTIFICATION_LIST_DEFAULTS.MAX_LIMIT)
      .optional(),
    unreadOnly: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid('true', 'false'))
      .optional(),
  }).validate(query, { abortEarly: false, stripUnknown: true });

const validateMarkReadParams = (params) =>
  Joi.object({
    notificationId: mongoId,
  }).validate(params, { abortEarly: false, stripUnknown: true });

const validateRegisterDeviceBody = (body) =>
  Joi.object({
    deviceToken: Joi.string().trim().min(10).max(4096).required(),
    oldDeviceToken: Joi.string().trim().min(10).max(4096).optional().allow('', null),
  }).validate(body, { abortEarly: false, stripUnknown: true });

const formatValidationErrors = (error) =>
  error.details.map((d) => ({
    field: d.path.join('.'),
    message: d.message,
  }));

module.exports = {
  validateNotificationListQuery,
  validateMarkReadParams,
  validateRegisterDeviceBody,
  formatValidationErrors,
};
