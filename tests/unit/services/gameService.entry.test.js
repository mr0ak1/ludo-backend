// Mock ProbabilityConfig to avoid DB calls during tests
jest.mock('../../../src/models/probabilityConfig.model', () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

const gameService = require('../../../src/services/gameService');

// Mock dependencies
jest.mock('../../../src/repositories/gameRepository');
jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/services/walletService');
jest.mock('../../../src/services/notificationService', () => ({
  notifyGameStarted: jest.fn().mockResolvedValue({}),
  notifyYourTurn: jest.fn().mockResolvedValue({}),
  notifyMatchFound: jest.fn().mockResolvedValue({}),
  notifyGameEnded: jest.fn().mockResolvedValue({}),
  notifyWalletUpdate: jest.fn().mockResolvedValue({}),
  notifyBonus: jest.fn().mockResolvedValue({}),
  createNotification: jest.fn().mockResolvedValue({}),
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  registerDeviceToken: jest.fn(),
  cleanupExpiredBefore: jest.fn(),
}));

const gameRepository = require('../../../src/repositories/gameRepository');
const userRepository = require('../../../src/repositories/userRepository');
const walletService = require('../../../src/services/walletService');

describe('GameService - Cash Game Entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should deduct entry fee and create cash game', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const entryFee = 100;

    // Mock user exists
    userRepository.findById = jest.fn().mockResolvedValue({ _id: userId, name: 'Test' });

    // Mock wallet processGameEntry
    walletService.processGameEntry = jest.fn().mockResolvedValue({ coins: 1000 });

    // Mock gameRepository.create to return created game
    const createdGame = { _id: 'game123', gameType: 'cash', entryFee, players: [] };
    gameRepository.create = jest.fn().mockResolvedValue(createdGame);

    const game = await gameService.createCashGame(userId, entryFee, 4);

    const entryGameId = walletService.processGameEntry.mock.calls[0][2];
    const createdGameData = gameRepository.create.mock.calls[0][0];

    expect(userRepository.findById).toHaveBeenCalledWith(userId);
    expect(walletService.processGameEntry).toHaveBeenCalledWith(userId, entryFee, entryGameId);
    expect(createdGameData).toEqual(expect.objectContaining({ gameId: entryGameId }));
    expect(game).toBe(createdGame);
  });

  it('should throw if user not found', async () => {
    const userId = '507f1f77bcf86cd799439099';
    userRepository.findById = jest.fn().mockResolvedValue(null);

    await expect(gameService.createCashGame(userId, 50, 4)).rejects.toThrow();
  });
});
