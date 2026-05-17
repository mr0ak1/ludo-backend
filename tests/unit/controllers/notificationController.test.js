const notificationController = require('../../../src/controllers/notificationController');
const notificationService = require('../../../src/services/notificationService');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');

jest.mock('../../../src/services/notificationService');

describe('NotificationController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { userId: '507f1f77bcf86cd799439011' }, query: {}, params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('getNotifications returns list', async () => {
    notificationService.getNotifications.mockResolvedValue({ notifications: [], pagination: {} });

    await notificationController.getNotifications(req, res, next);

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(next).not.toHaveBeenCalled();
  });

  it('markAsRead validates id', async () => {
    req.params = { notificationId: 'not-valid' };

    await notificationController.markAsRead(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('registerDevice calls service', async () => {
    req.body = { deviceToken: 'x'.repeat(30) };
    notificationService.registerDeviceToken.mockResolvedValue({ registered: true });

    await notificationController.registerDevice(req, res, next);

    expect(notificationService.registerDeviceToken).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
  });
});
