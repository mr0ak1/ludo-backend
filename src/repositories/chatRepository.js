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
    return row.toJSON();
  }

  /**
   * Keep only the newest MAX_MESSAGES_PER_GAME messages for a game.
   * @param {string} gameId
   * @private
   */
  async _trimOldestBeyondLimit(gameId) {
    const total = await ChatMessage.count({ where: { gameId } });
    if (total <= MAX_MESSAGES_PER_GAME) return;

    const excess = total - MAX_MESSAGES_PER_GAME;
    const oldest = await ChatMessage.findAll({
      where: { gameId },
      order: [['createdAt', 'ASC']],
      limit: excess,
      attributes: ['id'],
    });

    if (!oldest.length) return;

    await ChatMessage.destroy({
      where: {
        id: oldest.map((d) => d.id),
      },
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

    const { count, rows } = await ChatMessage.findAndCountAll({
      where: { gameId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(skip, 10),
    });

    const messages = [...rows].reverse().map(r => r.toJSON());

    return {
      messages,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit) || 1,
    };
  }
}

module.exports = new ChatRepository();
