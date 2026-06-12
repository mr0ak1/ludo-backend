const probabilityService = require('../../src/services/probabilityService');

// Mock the models used by the service
jest.mock('../../src/models/probabilityConfig.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/game.model', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn(),
}));

jest.mock('../../src/models/probabilityAudit.model', () => ({
  insertMany: jest.fn(),
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
    expect(Game.find).not.toHaveBeenCalled();
    expect(Game.bulkWrite).not.toHaveBeenCalled();
  });

  test('no active games exits cleanly', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 50 });
    Game.find.mockImplementation(() => ({ select: () => ({ lean: async () => [] }) }));
    await probabilityService.recalculate();
    expect(Game.find).toHaveBeenCalled();
    expect(Game.bulkWrite).not.toHaveBeenCalled();
  });

  test('assigns all easy when probability 100%', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 100 });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'hard') => ({
      _id: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
        { isBot: false },
      ],
    });

    const games = [
      makeGame(10, new Date('2020-01-01T00:00:00Z'), 'g1'),
      makeGame(20, new Date('2020-01-01T01:00:00Z'), 'g2'),
      makeGame(50, new Date('2020-01-01T02:00:00Z'), 'g3'),
    ];

    Game.find.mockImplementation(() => ({ select: () => ({ lean: async () => games }) }));
    Game.bulkWrite.mockResolvedValue({});
    ProbabilityAudit.insertMany.mockResolvedValue({});

    await probabilityService.recalculate();

    // All bot difficulties should be updated to 'easy' where they were 'hard'
    expect(Game.bulkWrite).toHaveBeenCalled();
    const ops = Game.bulkWrite.mock.calls[0][0];
    expect(ops.length).toBe(3);
    expect(ops[0].updateOne.update.$set.players[0].botDifficulty).toBe('easy');
    expect(ProbabilityAudit.insertMany).toHaveBeenCalled();
  });

  test('assigns floor(total * p/100) games to easy', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 30 });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'hard') => ({
      _id: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
      ],
    });

    // 10 games with ascending bets
    const games = [];
    for (let i = 1; i <= 10; i++) {
      games.push(makeGame(i * 10, new Date(2020, 0, i), `g${i}`));
    }

    // Shuffle not needed; service will sort
    Game.find.mockImplementation(() => ({ select: () => ({ lean: async () => games }) }));
    Game.bulkWrite.mockResolvedValue({});
    ProbabilityAudit.insertMany.mockResolvedValue({});

    await probabilityService.recalculate();

    // easyCount = floor(10 * 30 / 100) = 3 -> first 3 games must be updated
    expect(Game.bulkWrite).toHaveBeenCalled();
    const ops = Game.bulkWrite.mock.calls[0][0];
    // We expect 3 updates (first 3 games' botDifficulty changed)
    expect(ops.length).toBe(3);
    expect(ops[0].updateOne.update.$set.players[0].botDifficulty).toBe('easy');
    expect(ops[2].updateOne.update.$set.players[0].botDifficulty).toBe('easy');
    expect(ProbabilityAudit.insertMany).toHaveBeenCalled();
  });

  test('respects forceOverrideBotManagement false', async () => {
    ProbabilityConfig.findOne.mockResolvedValue({ enabled: true, winProbability: 100, forceOverrideBotManagement: false });

    const makeGame = (bet, createdAt, id, initialDifficulty = 'medium') => ({
      _id: id,
      betAmount: bet,
      createdAt,
      players: [
        { isBot: true, botDifficulty: initialDifficulty },
      ],
    });

    const games = [
      makeGame(10, new Date('2020-01-01T00:00:00Z'), 'g1'),
      makeGame(20, new Date('2020-01-01T01:00:00Z'), 'g2'),
    ];

    Game.find.mockImplementation(() => ({ select: () => ({ lean: async () => games }) }));
    Game.bulkWrite.mockResolvedValue({});
    ProbabilityAudit.insertMany.mockResolvedValue({});

    await probabilityService.recalculate();

    expect(Game.bulkWrite).not.toHaveBeenCalled();
    expect(ProbabilityAudit.insertMany).not.toHaveBeenCalled();
  });
});
