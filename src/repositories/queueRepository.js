const Queue = require('../models/queue.model');
const logger = require('../utils/logger');

/**
 * Queue Repository - Manages queue operations
 */
class QueueRepository {
  /**
   * Add user to queue
   * @param {String} userId - User ID
   * @param {Object} queueData - Queue data
   * @returns {Promise<Object>} Queue document
   */
  async create(userId, queueData) {
    try {
      const queue = new Queue({
        userId,
        ...queueData,
      });
      return await queue.save();
    } catch (error) {
      logger.error('Error creating queue entry:', error);
      throw error;
    }
  }

  /**
   * Find user's current queue entry
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} Queue document or null
   */
  async findByUserId(userId) {
    try {
      return await Queue.findOne({
        userId,
        status: { $in: ['waiting', 'matched'] },
      });
    } catch (error) {
      logger.error('Error finding queue entry:', error);
      throw error;
    }
  }

  /**
   * Find queue by ID
   * @param {String} queueId - Queue ID
   * @returns {Promise<Object|null>} Queue document
   */
  async findById(queueId) {
    try {
      return await Queue.findById(queueId);
    } catch (error) {
      logger.error('Error finding queue by ID:', error);
      throw error;
    }
  }

  /**
   * Update queue entry
   * @param {String} queueId - Queue ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated queue document
   */
  async update(queueId, updateData) {
    try {
      return await Queue.findByIdAndUpdate(queueId, updateData, { new: true });
    } catch (error) {
      logger.error('Error updating queue:', error);
      throw error;
    }
  }

  /**
   * Remove from queue
   * @param {String} queueId - Queue ID
   * @returns {Promise<Object>} Deleted queue document
   */
  async delete(queueId) {
    try {
      return await Queue.findByIdAndDelete(queueId);
    } catch (error) {
      logger.error('Error deleting queue entry:', error);
      throw error;
    }
  }

  /**
   * Cancel queue entry
   * @param {String} queueId - Queue ID
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Updated queue document
   */
  async cancel(queueId, reason) {
    try {
      return await Queue.findByIdAndUpdate(
        queueId,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
        { new: true }
      );
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
      return await Queue.find({
        gameType,
        status: 'waiting',
      })
        .sort({ joinedAt: 1 })
        .limit(limit);
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
      const total = await Queue.countDocuments();
      const waiting = await Queue.countDocuments({ status: 'waiting' });
      const matched = await Queue.countDocuments({ status: 'matched' });
      const cancelled = await Queue.countDocuments({ status: 'cancelled' });

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
