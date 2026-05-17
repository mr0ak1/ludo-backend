const mongoose = require('mongoose');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const {
  LEADERBOARD_TOP_N,
  LEADERBOARD_MIN_GAMES,
} = require('../constants/stats.constants');

class StatsRepository {
  /**
   * Leaderboard: win rate (min games), tiebreaker total games, then wins, then _id.
   * Excludes bots.
   */
  async fetchLeaderboardRaw() {
    try {
      return User.find({
        isBot: { $ne: true },
        totalGames: { $gte: LEADERBOARD_MIN_GAMES },
      })
        .sort({ winRate: -1, totalGames: -1, wins: -1, _id: 1 })
        .limit(LEADERBOARD_TOP_N)
        .select('name avatar wins losses totalGames winRate rankPoints')
        .lean();
    } catch (error) {
      logger.error('fetchLeaderboardRaw error:', error);
      throw error;
    }
  }

  /**
   * Rank position (1-based) for a human with enough games; null if unranked.
   */
  async countUsersRankedAbove(userId, me) {
    try {
      if (!me || me.isBot || me.totalGames < LEADERBOARD_MIN_GAMES) {
        return null;
      }
      const oid = new mongoose.Types.ObjectId(userId);
      const ahead = await User.countDocuments({
        isBot: { $ne: true },
        totalGames: { $gte: LEADERBOARD_MIN_GAMES },
        $or: [
          { winRate: { $gt: me.winRate } },
          {
            winRate: me.winRate,
            totalGames: { $gt: me.totalGames },
          },
          {
            winRate: me.winRate,
            totalGames: me.totalGames,
            wins: { $gt: me.wins },
          },
          {
            winRate: me.winRate,
            totalGames: me.totalGames,
            wins: me.wins,
            _id: { $lt: oid },
          },
        ],
      });
      return ahead + 1;
    } catch (error) {
      logger.error('countUsersRankedAbove error:', error);
      return null;
    }
  }
}

module.exports = new StatsRepository();
