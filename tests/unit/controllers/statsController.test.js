jest.mock('../../../src/services/statsService');

const statsController = require('../../../src/controllers/statsController');
const statsService = require('../../../src/services/statsService');

describe('statsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMyStats returns 200', async () => {
    statsService.getMyStats = jest.fn().mockResolvedValue({ userId: 'u1' });
    const req = { user: { userId: 'u1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await statsController.getMyStats(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('getMatchHistory forwards validation errors', async () => {
    const req = { user: { userId: 'u1' }, query: { limit: 9999 } };
    const res = {};
    const next = jest.fn();
    await statsController.getMatchHistory(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });
});
