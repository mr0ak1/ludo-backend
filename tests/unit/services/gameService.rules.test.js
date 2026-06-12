const gameService = require('../../../src/services/gameService');

jest.mock('../../../src/repositories/gameRepository');
jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/services/walletService');
jest.mock('../../../src/services/notificationService', () => ({
  notifyGameStarted: jest.fn(),
  notifyYourTurn: jest.fn(),
  notifyMatchFound: jest.fn(),
  notifyGameEnded: jest.fn(),
  notifyWalletUpdate: jest.fn(),
  notifyBonus: jest.fn(),
  createNotification: jest.fn(),
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  registerDeviceToken: jest.fn(),
  cleanupExpiredBefore: jest.fn(),
}));

describe('GameService - rule helpers', () => {
  it('maps local board positions to global positions consistently', () => {
    expect(gameService._getGlobalBoardPosition(0, 0)).toBe(1);
    expect(gameService._getGlobalBoardPosition(0, 1)).toBe(14);
    expect(gameService._getGlobalBoardPosition(50, 0)).toBe(51);
  });

  it('detects kills on the main track and ignores safe zones and home lanes', () => {
    const game = {
      players: [
        {
          tokens: [{ position: 5 }, { position: -1 }, { position: -1 }, { position: -1 }],
        },
        {
          tokens: [{ position: 44 }, { position: -1 }, { position: -1 }, { position: -1 }],
        },
      ],
    };

    expect(gameService._checkKill(game, 0, 5)).toEqual({ playerIndex: 1, tokenIndex: 0 });
    expect(gameService._checkKill(game, 0, 0)).toBeNull();
    expect(gameService._checkKill(game, 0, 52)).toBeNull();
  });

  it('allows unlock only on six and exact finish moves', () => {
    const unlockPlayer = {
      tokens: [
        { position: -1 },
        { position: 50 },
        { position: 56 },
        { position: 56 },
      ],
      isHome: [false, false, true, true],
    };

    const exactFinishPlayer = {
      tokens: [
        { position: 50 },
        { position: 56 },
        { position: 56 },
        { position: 56 },
      ],
      isHome: [false, true, true, true],
    };

    expect(gameService._getValidMoves(unlockPlayer, 6)).toEqual([0, 1]);
    expect(gameService._getValidMoves(unlockPlayer, 5)).toEqual([1]);
    expect(gameService._getValidMoves(exactFinishPlayer, 6)).toEqual([0]);
    expect(gameService._getValidMoves(exactFinishPlayer, 7)).toEqual([]);
  });
});