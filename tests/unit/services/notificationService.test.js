jest.mock('../../../src/repositories/notificationRepository');
jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/config/firebase', () => ({
  sendMulticastNotification: jest.fn().mockResolvedValue({
    successCount: 0,
    failureCount: 0,
    invalidTokens: [],
  }),
}));

const notificationService = require('../../../src/services/notificationService');
const notificationRepository = require('../../../src/repositories/notificationRepository');
const userRepository = require('../../../src/repositories/userRepository');
const { NOTIFICATION_TYPES } = require('../../../src/constants/notification.constants');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationRepository.create.mockImplementation(async (doc) => ({
      _id: '507f1f77bcf86cd799439099',
      ...doc,
    }));
    notificationRepository.findByUserId.mockResolvedValue({
      notifications: [],
      pagination: { total: 0, page: 1, pages: 1, limit: 20 },
    });
    notificationRepository.markAsRead.mockResolvedValue({ _id: '507f1f77bcf86cd799439099', isRead: true });
    notificationRepository.updateDeliveryMeta.mockResolvedValue({});
    userRepository.findById.mockResolvedValue({ _id: 'u1', deviceTokens: [], isBot: false });
    userRepository.addDeviceToken.mockResolvedValue({});
    userRepository.removeDeviceToken.mockResolvedValue({});
  });

  describe('createNotification', () => {
    it('should persist a notification', async () => {
      const doc = await notificationService.createNotification('507f1f77bcf86cd799439011', NOTIFICATION_TYPES.SYSTEM_ALERT, {
        title: 'Maintenance',
        body: 'Downtime at midnight',
        sendPush: false,
      });

      expect(notificationRepository.create).toHaveBeenCalled();
      expect(doc.type).toBe(NOTIFICATION_TYPES.SYSTEM_ALERT);
    });
  });

  describe('getNotifications', () => {
    it('should pass pagination to repository', async () => {
      await notificationService.getNotifications('507f1f77bcf86cd799439011', { page: 2, limit: 5 });

      expect(notificationRepository.findByUserId).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({ page: 2, limit: 5 })
      );
    });
  });

  describe('markAsRead', () => {
    it('should throw when notification missing', async () => {
      notificationRepository.markAsRead.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439099')
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
    });
  });

  describe('registerDeviceToken', () => {
    it('should reject empty token', async () => {
      await expect(
        notificationService.registerDeviceToken('507f1f77bcf86cd799439011', '')
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.BAD_REQUEST });
    });

    it('should add token and remove old when refresh', async () => {
      await notificationService.registerDeviceToken(
        '507f1f77bcf86cd799439011',
        'new-token-value-xxxxxxxx',
        'old-token-value-xxxxxxxx'
      );

      expect(userRepository.removeDeviceToken).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'old-token-value-xxxxxxxx'
      );
      expect(userRepository.addDeviceToken).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'new-token-value-xxxxxxxx'
      );
    });
  });

  describe('notifyGameEnded', () => {
    it('should use game_ended type and set title/body for winner when true', async () => {
      const doc = await notificationService.notifyGameEnded('507f1f77bcf86cd799439011', {
        gameId: '507f1f77bcf86cd799439022',
        isWinner: true,
      });

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NOTIFICATION_TYPES.GAME_ENDED,
          userId: '507f1f77bcf86cd799439011',
        })
      );
      expect(doc.title).toBe('Victory');
      expect(doc.body).toBe('Congratulations, you won the game.');
    });

    it('should set title/body for loser when false', async () => {
      const doc = await notificationService.notifyGameEnded('507f1f77bcf86cd799439011', {
        gameId: '507f1f77bcf86cd799439022',
        isWinner: false,
      });

      expect(doc.title).toBe('Game ended');
      expect(doc.body).toBe('The game has finished. See results in the app.');
    });
  });

  describe('cleanupExpiredBefore', () => {
    it('should delegate to repository', async () => {
      notificationRepository.deleteByExpiresAtBefore = jest.fn().mockResolvedValue(3);
      const n = await notificationService.cleanupExpiredBefore(new Date('2020-01-01'));
      expect(n).toBe(3);
    });
  });
});
