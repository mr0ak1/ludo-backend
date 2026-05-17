const chatValidator = require('../../../src/validators/chatValidator');

describe('chatValidator', () => {
  it('validateGameIdParam accepts 24 hex', () => {
    const { error } = chatValidator.validateGameIdParam({ gameId: '507f1f77bcf86cd799439011' });
    expect(error).toBeUndefined();
  });

  it('validateGameIdParam rejects short id', () => {
    const { error } = chatValidator.validateGameIdParam({ gameId: 'abc' });
    expect(error).toBeDefined();
  });

  it('validateSendMessageBody requires message', () => {
    const { error } = chatValidator.validateSendMessageBody({});
    expect(error).toBeDefined();
  });

  it('validateChatHistoryQuery accepts empty', () => {
    const { error, value } = chatValidator.validateChatHistoryQuery({});
    expect(error).toBeUndefined();
    expect(value).toEqual({});
  });
});
