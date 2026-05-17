const gameService = require('../../../src/services/gameService');

jest.mock('../../../src/repositories/gameRepository');
jest.mock('../../../src/repositories/userRepository');

const gameRepository = require('../../../src/repositories/gameRepository');
const userRepository = require('../../../src/repositories/userRepository');

describe('GameService - Turn Rotation & Consecutive Sixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow another turn on rolling a 6 and cancel on third consecutive 6', async () => {
    const gameId = 'game123';
    const userId = '507f1f77bcf86cd799439011';

    // Build a mock game with two players
    const mockGame = {
      _id: gameId,
      status: 'active',
      players: [
        {
          userId: { toString: () => userId },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 2,
          isHome: [false, false, false, false],
        },
        {
          userId: { toString: () => 'otherUser' },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        }
      ],
      currentTurn: 0,
      maxPlayers: 2,
      startTime: new Date(),
    };

    // Mock findById
    gameRepository.findById = jest.fn().mockResolvedValue(mockGame);
    gameRepository.addMove = jest.fn().mockResolvedValue(true);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(true);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(true);

    // First: roll a 6 (third consecutive)
    const rollResult = await gameService.rollDice(gameId, userId);
    // diceValue is random; to reliably test, we will call moveToken instead with diceValue 6

    const moveResult = await gameService.moveToken(gameId, userId, 0, 6);

    // After third consecutive 6, updateCurrentTurn should have been called to move to next player
    expect(gameRepository.updateCurrentTurn).toHaveBeenCalled();
  });

  it('should move to next player on non-6 roll', async () => {
    const gameId = 'game456';
    const userId = '507f1f77bcf86cd799439011';

    const mockGame = {
      _id: gameId,
      status: 'active',
      players: [
        {
          userId: { toString: () => userId },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        },
        {
          userId: { toString: () => 'otherUser' },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        }
      ],
      currentTurn: 0,
      maxPlayers: 2,
      startTime: new Date(),
    };

    gameRepository.findById = jest.fn().mockResolvedValue(mockGame);
    gameRepository.addMove = jest.fn().mockResolvedValue(true);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(true);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(true);

    const result = await gameService.moveToken(gameId, userId, 0, 3);

    expect(gameRepository.updatePlayerBoard).toHaveBeenCalledWith(
      gameId,
      0,
      expect.objectContaining({
        consecutiveSixes: 0,
      })
    );
    expect(gameRepository.updateCurrentTurn).toHaveBeenCalledWith(gameId, 1);
  });

  it('should auto-skip timed out games when fetching details', async () => {
    const gameId = 'game789';
    const staleAt = new Date(Date.now() - 25000);

    const staleGame = {
      _id: gameId,
      status: 'active',
      players: [
        {
          userId: { toString: () => 'player1' },
          tokens: [
            { position: 0, active: true },
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
          ],
          consecutiveSixes: 1,
          isHome: [false, false, false, false],
        },
        {
          userId: { toString: () => 'player2' },
          tokens: [
            { position: 0, active: true },
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
          ],
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        },
      ],
      currentTurn: 0,
      maxPlayers: 2,
      updatedAt: staleAt,
      startTime: new Date(),
    };

    const refreshedGame = {
      ...staleGame,
      currentTurn: 1,
      updatedAt: new Date(),
      players: staleGame.players.map((player, index) => ({
        ...player,
        consecutiveSixes: index === 0 ? 0 : player.consecutiveSixes,
      })),
    };

    gameRepository.findById = jest
      .fn()
      .mockResolvedValueOnce(staleGame)
      .mockResolvedValueOnce(refreshedGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(true);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(true);
    gameRepository.addMove = jest.fn().mockResolvedValue(true);

    const details = await gameService.getGameDetails(gameId);

    expect(gameRepository.updateCurrentTurn).toHaveBeenCalledWith(gameId, 1);
    expect(gameRepository.addMove).toHaveBeenCalledWith(
      gameId,
      expect.objectContaining({ action: 'turn_timeout' })
    );
    expect(details.currentTurn).toBe(1);
  });
});
