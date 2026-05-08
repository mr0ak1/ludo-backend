const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

/**
 * Validation Middleware - Validate request body against schema
 */
const validationMiddleware = (schema) => {
  return async (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = {};
        error.details.forEach((detail) => {
          errors[detail.path.join('.')] = detail.message;
        });

        throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, 'Validation error', errors);
      }

      req.validatedBody = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validation Middleware for params
 */
const validateParamsMiddleware = (schema) => {
  return async (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        const errors = {};
        error.details.forEach((detail) => {
          errors[detail.path.join('.')] = detail.message;
        });

        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid parameters', errors);
      }

      req.validatedParams = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validation Middleware for query
 */
const validateQueryMiddleware = (schema) => {
  return async (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
      });

      if (error) {
        const errors = {};
        error.details.forEach((detail) => {
          errors[detail.path.join('.')] = detail.message;
        });

        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid query parameters', errors);
      }

      req.validatedQuery = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  validationMiddleware,
  validateParamsMiddleware,
  validateQueryMiddleware,
};
