const statsValidator = require('../../../src/validators/statsValidator');

describe('statsValidator', () => {
  it('accepts valid match history query', () => {
    const { error, value } = statsValidator.validateMatchHistoryQuery({
      page: '2',
      limit: '10',
      gameType: 'cash',
    });
    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(10);
    expect(value.gameType).toBe('cash');
  });

  it('rejects invalid gameType', () => {
    const { error } = statsValidator.validateMatchHistoryQuery({ gameType: 'pvp' });
    expect(error).toBeDefined();
  });

  it('validates player id param', () => {
    const id = '507f1f77bcf86cd799439011';
    const { error } = statsValidator.validatePlayerParams({ userId: id });
    expect(error).toBeUndefined();
  });

  it('rejects bad player id', () => {
    const { error } = statsValidator.validatePlayerParams({ userId: 'bad' });
    expect(error).toBeDefined();
  });
});
