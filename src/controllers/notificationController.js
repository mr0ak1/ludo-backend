const notificationService = require('../services/notificationService');
const notificationValidator = require('../validators/notificationValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

/**
 * GET /api/v1/notification
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error, value } = notificationValidator.validateNotificationListQuery(req.query);
    if (error) {
      const errors = notificationValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const result = await notificationService.getNotifications(userId, value);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Notifications retrieved', result)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/notification/:notificationId/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error: pErr, value: pVal } = notificationValidator.validateMarkReadParams(req.params);
    if (pErr) {
      const errors = notificationValidator.formatValidationErrors(pErr);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const updated = await notificationService.markAsRead(userId, pVal.notificationId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Notification marked as read', { notification: updated })
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/notification/register-device (FCM token registration / refresh — roadmap 8.4)
 */
const registerDevice = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error, value } = notificationValidator.validateRegisterDeviceBody(req.body);
    if (error) {
      const errors = notificationValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    await notificationService.registerDeviceToken(userId, value.deviceToken, value.oldDeviceToken);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Device token registered', { registered: true })
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/notification/latest-popup
 */
const getLatestPopup = async (req, res, next) => {
  try {
    const Popup = require('../models/popup.model');
    const latestPopup = await Popup.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Latest popup retrieved', { popup: latestPopup })
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  registerDevice,
  getLatestPopup,
};
