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
    expect(s.currentRank).toBeGreaterThanOrEqual(200);
    expect(s.currentRank).toBeLessThanOrEqual(800);
    expect(s.gamesThisWeek).toBe(2);
    expect(matchHistoryRepository.countMatchesInRange).toHaveBeenCalledTimes(3);
  });

  it('getLeaderboard returns 500 sorted demo entries with Indian names', async () => {
    const res = await statsService.getLeaderboard();
    expect(res.leaderboard).toHaveLength(500);

    // Check ranks and earnings sorting
    for (let i = 0; i < 499; i++) {
      expect(res.leaderboard[i].rank).toBe(i + 1);
      expect(res.leaderboard[i].totalEarnings).toBeGreaterThanOrEqual(res.leaderboard[i+1].totalEarnings);
    }

    // Check name format (non-empty first and last name)
    expect(res.leaderboard[0].name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('getPlayerStats hides bots', async () => {
    userRepository.findById = jest.fn().mockResolvedValue({ ...sampleUser, isBot: true });
    await expect(statsService.getPlayerStats(null, '507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
