const ChatMessage = require('../models/chatMessage.model');
const logger = require('../utils/logger');

const MAX_MESSAGES_PER_GAME = 100;

class ChatRepository {
  /**
   * @param {Object} doc
   * @returns {Promise<Object>}
   */
  async create(doc) {
    const row = await ChatMessage.create(doc);
    await this._trimOldestBeyondLimit(doc.gameId);
    return row;
  }

  /**
   * Keep only the newest MAX_MESSAGES_PER_GAME messages for a game.
   * @param {import('mongoose').Types.ObjectId} gameId
   * @private
   */
  async _trimOldestBeyondLimit(gameId) {
    const total = await ChatMessage.countDocuments({ gameId });
    if (total <= MAX_MESSAGES_PER_GAME) return;

    const excess = total - MAX_MESSAGES_PER_GAME;
    const oldest = await ChatMessage.find({ gameId })
      .sort({ createdAt: 1 })
      .limit(excess)
      .select('_id')
      .lean();

    if (!oldest.length) return;

    await ChatMessage.deleteMany({
      _id: { $in: oldest.map((d) => d._id) },
    });
    logger.debug(`Chat trim: removed ${oldest.length} old messages for game ${gameId}`);
  }

  /**
   * @param {string} gameId
   * @param {{ page?: number, limit?: number }} pagination
   * @returns {Promise<{ messages: Object[], total: number, page: number, limit: number, pages: number }>}
   */
  async findByGameId(gameId, pagination = {}) {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 50));
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      ChatMessage.countDocuments({ gameId }),
      ChatMessage.find({ gameId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      messages: rows.reverse(),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }
}

module.exports = new ChatRepository();
