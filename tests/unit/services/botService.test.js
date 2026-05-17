const botService = require('../../../src/services/botService');

jest.mock('../../../src/repositories/userRepository');

const userRepository = require('../../../src/repositories/userRepository');

describe('BotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect bot players by user record', async () => {
    userRepository.findById = jest.fn().mockResolvedValue({ _id: 'bot1', isBot: true });

    const game = {
      players: [
        { userId: 'bot1' },
      ],
    };

    await expect(botService.isPlayerBot(game, 0)).resolves.toBe(true);
    expect(userRepository.findById).toHaveBeenCalledWith('bot1');
  });

  it('should fallback to easy level when bot level is missing', async () => {
    userRepository.findById = jest.fn().mockResolvedValue({ _id: 'bot1', isBot: true });

    const game = {
      players: [
        { userId: 'bot1' },
      ],
    };

    await expect(botService.getBotLevel(game, 0)).resolves.toBe('easy');
  });

  it('should calculate valid moves for starting and active tokens', () => {
    const player = {
      tokens: [
        { position: -1 },
        { position: 10 },
        { position: 50 },
        { position: 55 },
      ],
      isHome: [false, false, false, true],
    };

    expect(botService.getValidMoves(player, 6)).toEqual([0, 1, 2]);
    expect(botService.getValidMoves(player, 3)).toEqual([1, 2]);
  });

  it('should return an easy move from valid moves', async () => {
    userRepository.findById = jest.fn().mockResolvedValue({ _id: 'bot1', isBot: true, botLevel: 'easy' });
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const game = {
      players: [
        {
          userId: 'bot1',
          tokens: [{ position: -1 }, { position: 0 }, { position: 0 }, { position: 0 }],
          isHome: [false, false, false, false],
        },
      ],
    };

    await expect(botService.decideMove(game, 0, [1, 2, 3], 6)).resolves.toBe(1);

    randomSpy.mockRestore();
  });

  it('should provide stable thinking delays by difficulty', () => {
    expect(botService.getThinkingDelay('easy')).toBeGreaterThan(0);
    expect(botService.getThinkingDelay('medium')).toBeGreaterThan(botService.getThinkingDelay('easy'));
    expect(botService.getThinkingDelay('hard')).toBeGreaterThan(botService.getThinkingDelay('medium'));
    expect(botService.getThinkingDelay('unknown')).toBe(botService.getThinkingDelay('easy'));
  });
});
