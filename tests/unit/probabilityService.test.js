const probabilityService = require('../../src/services/probabilityService');

// Mock the models used by the service
jest.mock('../../src/models/probabilityConfig.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/game.model', () => ({
  findAll: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../src/models/probabilityAudit.model', () => ({
  bulkCreate: jest.fn(),
}));

const ProbabilityConfig = require('../../src/models/probabilityConfig.model');
const Game = require('../../src/models/game.model');
const ProbabilityAudit = require('../../src/models/probabilityAudit.model');

describe('ProbabilityService.recalculate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('no-op when config disabled', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: false, winProbability: 50 });
    await probabilityService.recalculate();
    expect(Game.findAll).not.toHaveBeenCalled();
    expect(Game.update).not.toHaveBeenCalled();
  });

  test('no active games exits cleanly', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 50 });
    Game.findAll.mockResolvedValue([]);
    await probabilityService.recalculate();
    expect(Game.findAll).toHaveBeenCalled();
    expect(Game.update).not.toHaveBeenCalled();
  });

  test('assigns all easy when probability 100%', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 100 });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'hard') => ({
      id,
      gameId: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
        { isBot: false },
      ],
      toJSON() { return this; }
    });

    const games = [
      makeGame(10, new Date('2020-01-01T00:00:00Z'), 'g1'),
      makeGame(20, new Date('2020-01-01T01:00:00Z'), 'g2'),
      makeGame(50, new Date('2020-01-01T02:00:00Z'), 'g3'),
    ];

    Game.findAll.mockResolvedValue(games);
    Game.update.mockResolvedValue([1]);
    ProbabilityAudit.bulkCreate.mockResolvedValue({});

    await probabilityService.recalculate();

    // All bot difficulties should be updated to 'easy' where they were 'hard'
    expect(Game.update).toHaveBeenCalledTimes(3);
    expect(Game.update).toHaveBeenNthCalledWith(1, { players: [{ isBot: true, botDifficulty: 'easy' }, { isBot: false }] }, { where: { id: 'g1' } });
    expect(Game.update).toHaveBeenNthCalledWith(2, { players: [{ isBot: true, botDifficulty: 'easy' }, { isBot: false }] }, { where: { id: 'g2' } });
    expect(Game.update).toHaveBeenNthCalledWith(3, { players: [{ isBot: true, botDifficulty: 'easy' }, { isBot: false }] }, { where: { id: 'g3' } });
    expect(ProbabilityAudit.bulkCreate).toHaveBeenCalled();
  });

  test('assigns floor(total * p/100) games to easy', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 30 });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'hard') => ({
      id,
      gameId: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
      ],
      toJSON() { return this; }
    });

    // 10 games with ascending bets
    const games = [];
    for (let i = 1; i <= 10; i++) {
      games.push(makeGame(i * 10, new Date(2020, 0, i), `g${i}`));
    }

    Game.findAll.mockResolvedValue(games);
    Game.update.mockResolvedValue([1]);
    ProbabilityAudit.bulkCreate.mockResolvedValue({});

    await probabilityService.recalculate();

    // easyCount = floor(10 * 30 / 100) = 3 -> first 3 games must be updated to 'easy'
    // remaining 7 games will be assigned 'hard', but they are already 'hard' so they won't trigger Game.update!
    expect(Game.update).toHaveBeenCalledTimes(3);
    expect(Game.update).toHaveBeenNthCalledWith(1, { players: [{ isBot: true, botDifficulty: 'easy' }] }, { where: { id: 'g1' } });
    expect(Game.update).toHaveBeenNthCalledWith(2, { players: [{ isBot: true, botDifficulty: 'easy' }] }, { where: { id: 'g2' } });
    expect(Game.update).toHaveBeenNthCalledWith(3, { players: [{ isBot: true, botDifficulty: 'easy' }] }, { where: { id: 'g3' } });
    expect(ProbabilityAudit.bulkCreate).toHaveBeenCalled();
  });

  test('respects forceOverrideBotManagement false', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 100, forceOverrideBotManagement: false });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'medium') => ({
      id,
      gameId: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
      ],
      toJSON() { return this; }
    });

    const games = [
      makeGame(10, new Date('2020-01-01T00:00:00Z'), 'g1'),
      makeGame(20, new Date('2020-01-01T01:00:00Z'), 'g2'),
    ];

    Game.findAll.mockResolvedValue(games);
    Game.update.mockResolvedValue([1]);
    ProbabilityAudit.bulkCreate.mockResolvedValue({});

    await probabilityService.recalculate();

    expect(Game.update).not.toHaveBeenCalled();
    expect(ProbabilityAudit.bulkCreate).not.toHaveBeenCalled();
  });
});
