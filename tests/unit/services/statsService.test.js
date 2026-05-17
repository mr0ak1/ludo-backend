jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/repositories/statsRepository');
jest.mock('../../../src/repositories/matchHistoryRepository');

const statsService = require('../../../src/services/statsService');
const userRepository = require('../../../src/repositories/userRepository');
const statsRepository = require('../../../src/repositories/statsRepository');
const matchHistoryRepository = require('../../../src/repositories/matchHistoryRepository');

const sampleUser = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  name: 'A',
  avatar: null,
  wins: 12,
  losses: 3,
  totalGames: 15,
  winRate: 80,
  isBot: false,
  totalCoinsWon: 100,
  totalCoinsLost: 40,
  rankPoints: 400,
  bestWinStreak: 5,
  currentWinStreak: 2,
  favoriteTokenColor: 'red',
};

describe('StatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statsService.invalidateLeaderboardCache();
  });

  it('getMyStats returns roadmap fields', async () => {
    userRepository.findById = jest.fn().mockResolvedValue(sampleUser);
    matchHistoryRepository.countMatchesInRange = jest.fn().mockResolvedValue(2);
    statsRepository.countUsersRankedAbove = jest.fn().mockResolvedValue(4);

    const s = await statsService.getMyStats('507f1f77bcf86cd799439011');
    expect(s.totalGamesPlayed).toBe(15);
    expect(s.totalWins).toBe(12);
    expect(s.currentRank).toBe(4);
    expect(s.gamesThisWeek).toBe(2);
    expect(matchHistoryRepository.countMatchesInRange).toHaveBeenCalledTimes(3);
  });

  it('getLeaderboard caches results until invalidated', async () => {
    const row = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      name: 'Top',
      avatar: null,
      wins: 20,
      losses: 5,
      totalGames: 25,
      winRate: 80,
      rankPoints: 600,
    };
    statsRepository.fetchLeaderboardRaw = jest.fn().mockResolvedValue([row]);

    const a = await statsService.getLeaderboard();
    const b = await statsService.getLeaderboard();
    expect(a.leaderboard).toHaveLength(1);
    expect(a.leaderboard[0].rank).toBe(1);
    expect(b.cached).toBe(true);
    expect(statsRepository.fetchLeaderboardRaw).toHaveBeenCalledTimes(1);

    statsService.invalidateLeaderboardCache();
    await statsService.getLeaderboard();
    expect(statsRepository.fetchLeaderboardRaw).toHaveBeenCalledTimes(2);
  });

  it('getPlayerStats hides bots', async () => {
    userRepository.findById = jest.fn().mockResolvedValue({ ...sampleUser, isBot: true });
    await expect(statsService.getPlayerStats(null, '507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
