const gameService = require('../../../src/services/gameService');
const { sequelize } = require('../../../src/config/db');

jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback) => {
  return callback({});
});

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
      currentTurnCount: 0,
      diceValue: 6,
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
    gameRepository.addMove = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(mockGame);
    gameRepository.update = jest.fn().mockResolvedValue(mockGame);

    const moveResult = await gameService.moveToken(gameId, userId, 0, 0);

    // After third consecutive 6, updateCurrentTurn should have been called to move to next player
    expect(gameRepository.updateCurrentTurn).toHaveBeenCalled();
  });

  it('should move to next player on non-6 roll', async () => {
    const gameId = 'game456';
    const userId = '507f1f77bcf86cd799439011';

    const mockGame = {
      _id: gameId,
      status: 'active',
      currentTurnCount: 0,
      diceValue: 3,
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
    gameRepository.addMove = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(mockGame);
    gameRepository.update = jest.fn().mockResolvedValue(mockGame);

    const result = await gameService.moveToken(gameId, userId, 0, 0);

    expect(gameRepository.updatePlayerBoard.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        consecutiveSixes: 0,
      })
    );
    expect(gameRepository.updateCurrentTurn.mock.calls[0][1]).toBe(1);
  });

  it('should auto-skip timed out games when fetching details', async () => {
    const gameId = 'game789';
    const staleAt = new Date(Date.now() - 25000);

    const staleGame = {
      _id: gameId,
      status: 'active',
      currentTurnCount: 0,
      turnStartedAt: staleAt,
      diceValue: 3,
      players: [
        {
          userId: { toString: () => 'player1' },
          tokens: [
            { position: -1, active: false },
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
      .mockResolvedValue(refreshedGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(refreshedGame);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(refreshedGame);
    gameRepository.addMove = jest.fn().mockResolvedValue(refreshedGame);
    gameRepository.update = jest.fn().mockResolvedValue(refreshedGame);

    const details = await gameService.getGameDetails(gameId);

    expect(gameRepository.updateCurrentTurn).toHaveBeenCalledWith(gameId, 1);
    expect(gameRepository.addMove).toHaveBeenCalledWith(
      gameId,
      expect.objectContaining({ action: 'turn_timeout' })
    );
    expect(details.currentTurn).toBe(1);
  });

  it('should reset missedTurns to 0 on a manual move', async () => {
    const gameId = 'game123';
    const userId = '507f1f77bcf86cd799439011';

    const mockGame = {
      _id: gameId,
      status: 'active',
      currentTurnCount: 0,
      diceValue: 3,
      players: [
        {
          userId: { toString: () => userId },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 0,
          missedTurns: 2,
          isHome: [false, false, false, false],
        },
        {
          userId: { toString: () => 'otherUser' },
          tokens: [ { position: 0, active: true }, { position: -1, active: false }, { position: -1, active: false }, { position: -1, active: false } ],
          consecutiveSixes: 0,
          missedTurns: 0,
          isHome: [false, false, false, false],
        }
      ],
      currentTurn: 0,
      maxPlayers: 2,
      startTime: new Date(),
    };

    gameRepository.findById = jest.fn().mockResolvedValue(mockGame);
    gameRepository.addMove = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(mockGame);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(mockGame);
    gameRepository.update = jest.fn().mockResolvedValue(mockGame);

    await gameService.moveToken(gameId, userId, 0, 0);

    // Verify it updated the board with missedTurns: 0
    expect(gameRepository.updatePlayerBoard).toHaveBeenCalledWith(
      gameId,
      0,
      expect.objectContaining({
        missedTurns: 0,
      }),
      expect.any(Object)
    );
  });

  it('should trigger surrender when a player misses MAX_MISSED_TURNS (3) turns', async () => {
    const gameId = 'game789';
    const staleAt = new Date(Date.now() - 25000);

    const staleGame = {
      _id: gameId,
      status: 'active',
      currentTurnCount: 0,
      turnStartedAt: staleAt,
      diceValue: 0,
      players: [
        {
          userId: { toString: () => 'player1' },
          tokens: [
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
          ],
          consecutiveSixes: 0,
          missedTurns: 2, // 2 missed turns, this timeout will be the 3rd
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

    gameRepository.findById = jest.fn().mockResolvedValue(staleGame);
    gameRepository.updatePlayerBoard = jest.fn().mockResolvedValue(staleGame);
    gameRepository.updateCurrentTurn = jest.fn().mockResolvedValue(staleGame);
    gameRepository.addMove = jest.fn().mockResolvedValue(staleGame);
    gameRepository.update = jest.fn().mockResolvedValue(staleGame);
    
    // Mock completeGame
    gameService.completeGame = jest.fn().mockResolvedValue({
      ...staleGame,
      status: 'surrendered',
      players: staleGame.players
    });

    await gameService.getGameDetails(gameId);

    // Verify it updated the board with isActive: false and completed the game
    expect(gameRepository.updatePlayerBoard).toHaveBeenCalledWith(
      gameId,
      0,
      expect.objectContaining({
        missedTurns: 3,
        isActive: false
      })
    );
    expect(gameService.completeGame).toHaveBeenCalledWith(
      gameId,
      expect.objectContaining({
        status: 'surrendered',
        reason: 'missed_3_turns'
      })
    );
  });
});
