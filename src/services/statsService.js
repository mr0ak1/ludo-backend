const userRepository = require('../repositories/userRepository');
const statsRepository = require('../repositories/statsRepository');
const matchHistoryRepository = require('../repositories/matchHistoryRepository');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const {
  LEADERBOARD_CACHE_TTL_MS,
  LEADERBOARD_MIN_GAMES,
} = require('../constants/stats.constants');

let leaderboardCache = {
  computedAt: 0,
  entries: null,
};

function nowRangeBounds() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getTime() + 1);
  return { startOfWeek, startOfMonth, startOfYear, end };
}

function formatPublicUser(u) {
  if (!u) return null;
  return {
    userId: u._id?.toString?.() || String(u._id),
    name: u.name,
    avatar: u.avatar,
    wins: u.wins,
    losses: u.losses,
    totalGames: u.totalGames,
    winRate: u.winRate,
    rankPoints: u.rankPoints ?? 0,
    bestWinStreak: u.bestWinStreak ?? 0,
    currentWinStreak: u.currentWinStreak ?? 0,
    favoriteTokenColor: u.favoriteTokenColor ?? null,
  };
}

class StatsService {
  invalidateLeaderboardCache() {
    leaderboardCache = { computedAt: 0, entries: null };
  }

  async getLeaderboard() {
    const fresh =
      leaderboardCache.entries &&
      Date.now() - leaderboardCache.computedAt < LEADERBOARD_CACHE_TTL_MS;

    if (fresh) {
      return {
        leaderboard: leaderboardCache.entries,
        cached: true,
        cacheExpiresInMs: LEADERBOARD_CACHE_TTL_MS - (Date.now() - leaderboardCache.computedAt),
      };
    }

    const raw = await statsRepository.fetchLeaderboardRaw();
    const entries = raw.map((row, idx) => ({
      rank: idx + 1,
      userId: row._id.toString(),
      name: row.name,
      avatar: row.avatar,
      wins: row.wins,
      losses: row.losses,
      totalGames: row.totalGames,
      winRate: row.winRate,
      rankPoints: row.rankPoints ?? 0,
    }));

    leaderboardCache = {
      computedAt: Date.now(),
      entries,
    };

    return {
      leaderboard: entries,
      cached: false,
      cacheExpiresInMs: LEADERBOARD_CACHE_TTL_MS,
    };
  }

  async getMyStats(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }
    if (user.isBot) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Stats not available for bot accounts');
    }

    const { startOfWeek, startOfMonth, startOfYear, end } = nowRangeBounds();
    const [gamesThisWeek, gamesThisMonth, gamesThisYear, currentRank] = await Promise.all([
      matchHistoryRepository.countMatchesInRange(userId, startOfWeek, end),
      matchHistoryRepository.countMatchesInRange(userId, startOfMonth, end),
      matchHistoryRepository.countMatchesInRange(userId, startOfYear, end),
      statsRepository.countUsersRankedAbove(userId, user),
    ]);

    return {
      userId: user._id.toString(),
      name: user.name,
      avatar: user.avatar,
      totalGamesPlayed: user.totalGames,
      totalWins: user.wins,
      totalLosses: user.losses,
      winRate: user.winRate,
      totalCoinsWon: user.totalCoinsWon ?? 0,
      totalCoinsLost: user.totalCoinsLost ?? 0,
      currentRank: currentRank,
      unranked: user.totalGames < LEADERBOARD_MIN_GAMES,
      rankPoints: user.rankPoints ?? 0,
      bestWinStreak: user.bestWinStreak ?? 0,
      currentWinStreak: user.currentWinStreak ?? 0,
      favoriteTokenColor: user.favoriteTokenColor ?? null,
      gamesThisWeek,
      gamesThisMonth,
      gamesThisYear,
    };
  }

  async getPlayerStats(_viewerUserId, targetUserId) {
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Player not found');
    }
    if (target.isBot) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Player not found');
    }
    if (target.isBanned) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Player not found');
    }

    const currentRank = await statsRepository.countUsersRankedAbove(targetUserId, target);
    const { startOfWeek, startOfMonth, startOfYear, end } = nowRangeBounds();
    const [gamesThisWeek, gamesThisMonth, gamesThisYear] = await Promise.all([
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfWeek, end),
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfMonth, end),
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfYear, end),
    ]);

    return {
      ...formatPublicUser(target),
      currentRank,
      unranked: target.totalGames < LEADERBOARD_MIN_GAMES,
      gamesThisWeek,
      gamesThisMonth,
      gamesThisYear,
    };
  }

  async getMatchHistory(userId, query) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }
    if (user.isBot) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Match history not available for bot accounts');
    }

    const result = await matchHistoryRepository.findByParticipantUserId(userId, query);
    const formatted = result.items.map((doc) => {
      const getParticipantId = (p) => {
        if (!p || !p.userId) return '';
        return p.userId._id ? p.userId._id.toString() : p.userId.toString();
      };
      const mine = doc.participants.find((p) => getParticipantId(p) === userId);
      const opponents = doc.participants.filter((p) => getParticipantId(p) !== userId);
      return {
        matchId: doc._id.toString(),
        gameId: doc.gameId.toString(),
        gameType: doc.gameType,
        endedAt: doc.endedAt,
        duration: doc.duration,
        totalMoves: doc.totalMoves,
        betAmount: doc.betAmount,
        winnerId: doc.winnerId ? doc.winnerId.toString() : null,
        myPlacement: mine?.placement,
        myCoinsWon: mine?.coinsWon ?? 0,
        myCoinsLost: mine?.coinsLost ?? 0,
        opponents: opponents.map((o) => ({
          userId: getParticipantId(o),
          isBot: o.isBot,
          placement: o.placement,
          playerColor: o.playerColor,
        })),
      };
    });

    return {
      matches: formatted,
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    };
  }
}

module.exports = new StatsService();
