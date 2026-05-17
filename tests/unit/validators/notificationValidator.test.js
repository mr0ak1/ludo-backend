const notificationValidator = require('../../../src/validators/notificationValidator');

describe('notificationValidator', () => {
  it('should validate list query', () => {
    const { error, value } = notificationValidator.validateNotificationListQuery({
      page: '2',
      limit: '10',
      unreadOnly: 'true',
    });
    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(10);
    expect(value.unreadOnly).toBe(true);
  });

  it('should reject invalid notification id param', () => {
    const { error } = notificationValidator.validateMarkReadParams({ notificationId: 'bad' });
    expect(error).toBeDefined();
  });

  it('should validate register device body', () => {
    const { error, value } = notificationValidator.validateRegisterDeviceBody({
      deviceToken: 'a'.repeat(20),
      oldDeviceToken: 'b'.repeat(20),
    });
    expect(error).toBeUndefined();
    expect(value.deviceToken).toHaveLength(20);
  });
});
