const Queue = require('../models/queue.model');
const logger = require('../utils/logger');

/**
 * Queue Repository - Manages queue operations using Sequelize
 */
class QueueRepository {
  /**
   * Add user to queue
   * @param {String|Number} userId - User ID
   * @param {Object} queueData - Queue data
   * @returns {Promise<Object>} Queue document
   */
  async create(userId, queueData) {
    try {
      const queue = await Queue.create({
        userId: parseInt(userId, 10),
        ...queueData,
      });
      return queue.toJSON();
    } catch (error) {
      logger.error('Error creating queue entry:', error);
      throw error;
    }
  }

  /**
   * Find user's current queue entry
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object|null>} Queue document or null
   */
  async findByUserId(userId) {
    try {
      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) return null;

      const queue = await Queue.findOne({
        where: {
          userId: numericUserId,
          status: ['waiting', 'matched'],
        },
      });
      return queue ? queue.toJSON() : null;
    } catch (error) {
      logger.error('Error finding queue entry:', error);
      throw error;
    }
  }

  /**
   * Find queue by ID
   * @param {String|Number} queueId - Queue ID
   * @returns {Promise<Object|null>} Queue document
   */
  async findById(queueId) {
    try {
      const numericId = parseInt(queueId, 10);
      if (isNaN(numericId)) return null;

      const queue = await Queue.findByPk(numericId);
      return queue ? queue.toJSON() : null;
    } catch (error) {
      logger.error('Error finding queue by ID:', error);
      throw error;
    }
  }

  /**
   * Update queue entry
   * @param {String|Number} queueId - Queue ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated queue document
   */
  async update(queueId, updateData) {
    try {
      const numericId = parseInt(queueId, 10);
      if (isNaN(numericId)) return null;

      const queue = await Queue.findByPk(numericId);
      if (!queue) return null;

      await queue.update(updateData);
      return queue.toJSON();
    } catch (error) {
      logger.error('Error updating queue:', error);
      throw error;
    }
  }

  /**
   * Remove from queue
   * @param {String|Number} queueId - Queue ID
   * @returns {Promise<Object>} Deleted queue document
   */
  async delete(queueId) {
    try {
      const numericId = parseInt(queueId, 10);
      if (isNaN(numericId)) return null;

      const queue = await Queue.findByPk(numericId);
      if (!queue) return null;

      const data = queue.toJSON();
      await queue.destroy();
      return data;
    } catch (error) {
      logger.error('Error deleting queue entry:', error);
      throw error;
    }
  }

  /**
   * Cancel queue entry
   * @param {String|Number} queueId - Queue ID
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Updated queue document
   */
  async cancel(queueId, reason) {
    try {
      const numericId = parseInt(queueId, 10);
      if (isNaN(numericId)) return null;

      const queue = await Queue.findByPk(numericId);
      if (!queue) return null;

      await queue.update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      });

      return queue.toJSON();
    } catch (error) {
      logger.error('Error cancelling queue entry:', error);
      throw error;
    }
  }

  /**
   * Find waiting players by game type
   * @param {String} gameType - Game type (practice, cash, tournament)
   * @param {Number} limit - Max results
   * @returns {Promise<Array>} Array of queue documents
   */
  async findWaitingByGameType(gameType, limit = 10) {
    try {
      const rows = await Queue.findAll({
        where: {
          gameType,
          status: 'waiting',
        },
        order: [['joinedAt', 'ASC']],
        limit: parseInt(limit, 10),
      });
      return rows.map(r => r.toJSON());
    } catch (error) {
      logger.error('Error finding waiting players:', error);
      throw error;
    }
  }

  /**
   * Get queue stats
   * @returns {Promise<Object>} Queue statistics
   */
  async getStats() {
    try {
      const total = await Queue.count();
      const waiting = await Queue.count({ where: { status: 'waiting' } });
      const matched = await Queue.count({ where: { status: 'matched' } });
      const cancelled = await Queue.count({ where: { status: 'cancelled' } });

      return {
        total,
        waiting,
        matched,
        cancelled,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }
}

module.exports = new QueueRepository();
