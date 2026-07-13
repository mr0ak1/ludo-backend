const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Transaction = require('../models/transaction.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class TransactionRepository {
  /**
   * Create a new transaction record
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async create(transactionData, options = {}) {
    try {
      const transaction = await Transaction.create(transactionData, {
        transaction: options.transaction,
      });
      logger.info(`Transaction created for user: ${transactionData.userId}, Type: ${transactionData.type}`);
      return transaction.toJSON();
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   * @param {String|Number} transactionId - Transaction ID
   * @returns {Promise<Object|null>} Transaction object or null
   */
  async findById(transactionId) {
    try {
      const numericId = parseInt(transactionId, 10);
      let transaction;
      if (!isNaN(numericId)) {
        transaction = await Transaction.findByPk(numericId);
      } else {
        transaction = await Transaction.findOne({ where: { transactionId } });
      }
      return transaction ? transaction.toJSON() : null;
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Find transactions by user ID with pagination
   * @param {String|Number} userId - User ID
   * @param {Object} pagination - Pagination options (page, limit)
   * @param {Object} filters - Additional filters (type, startDate, endDate)
   * @returns {Promise<Object>} Transactions and total count
   */
  async findByUserId(userId, pagination = {}, filters = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;
      const numericUserId = parseInt(userId, 10);

      const where = { userId: numericUserId };

      if (filters.excludeStatus) {
        where.status = { [Op.ne]: filters.excludeStatus };
      }

      // Filter by transaction type
      if (filters.type) {
        where.type = filters.type;
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt[Op.gte] = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt[Op.lte] = new Date(filters.endDate);
        }
      }

      // Filter by amount range
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount[Op.gte] = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          where.amount[Op.lte] = filters.maxAmount;
        }
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit: parseInt(limit, 10),
        offset: parseInt(skip, 10),
        order: [['createdAt', 'DESC']],
      });

      return {
        transactions: rows.map(t => t.toJSON()),
        total: count,
        page,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for user
   * @param {String|Number} userId - User ID
   * @param {Number} limit - Number of recent transactions
   * @returns {Promise<Array>} Recent transactions
   */
  async getRecentTransactions(userId, limit = 10) {
    try {
      const numericUserId = parseInt(userId, 10);
      const transactions = await Transaction.findAll({
        where: { userId: numericUserId },
        limit: parseInt(limit, 10),
        order: [['createdAt', 'DESC']],
      });

      return transactions.map(t => t.toJSON());
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary by type
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object>} Summary by transaction type
   */
  async getTransactionSummary(userId) {
    try {
      const numericUserId = parseInt(userId, 10);
      const summary = await Transaction.findAll({
        where: { userId: numericUserId, status: 'completed' },
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        ],
        group: ['type'],
        raw: true,
      });

      const result = {};
      summary.forEach(item => {
        result[item.type] = {
          count: parseInt(item.count, 10) || 0,
          totalAmount: parseInt(item.totalAmount, 10) || 0,
        };
      });

      return result;
    } catch (error) {
      logger.error('Error getting transaction summary:', error);
      throw error;
    }
  }

  /**
   * Get total coins earned/spent for user
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object>} Earnings and spending totals
   */
  async getUserCoinStats(userId) {
    try {
      const numericUserId = parseInt(userId, 10);
      const stats = await Transaction.findOne({
        where: { userId: numericUserId, status: 'completed' },
        attributes: [
          [sequelize.literal("COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)"), 'totalEarned'],
          [sequelize.literal("COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)"), 'totalSpent'],
          [sequelize.literal("COALESCE(SUM(CASE WHEN type IN ('game_reward', 'game_refund') AND amount > 0 THEN amount ELSE 0 END), 0)"), 'pnlEarned'],
          [sequelize.literal("COALESCE(SUM(CASE WHEN type = 'game_entry' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)"), 'pnlSpent'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        ],
        raw: true,
      });

      return {
        totalEarned: parseInt(stats.totalEarned, 10) || 0,
        totalSpent: parseInt(stats.totalSpent, 10) || 0,
        pnlEarned: parseInt(stats.pnlEarned, 10) || 0,
        pnlSpent: parseInt(stats.pnlSpent, 10) || 0,
        transactionCount: parseInt(stats.transactionCount, 10) || 0,
      };
    } catch (error) {
      logger.error('Error getting coin stats:', error);
      throw error;
    }
  }

  /**
   * Find all transactions with filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Transactions and total count
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where = {};
      if (filters.type) where.type = filters.type;
      if (filters.userId) where.userId = parseInt(filters.userId, 10);
      if (filters.reason) {
        where.reason = { [Op.like]: `%${filters.reason}%` };
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt[Op.gte] = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt[Op.lte] = new Date(filters.endDate);
        }
      }

      const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit: parseInt(limit, 10),
        offset: parseInt(skip, 10),
        order: [['createdAt', 'DESC']],
      });

      return {
        transactions: rows.map(t => t.toJSON()),
        total: count,
        page,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      logger.error('Error finding transactions:', error);
      throw error;
    }
  }

  /**
   * Delete transactions older than specified days
   * @param {Number} days - Number of days to keep
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOldTransactions(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deletedCount = await Transaction.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate },
        },
      });

      logger.info(`Deleted ${deletedCount} old transactions older than ${days} days`);
      return { deletedCount };
    } catch (error) {
      logger.error('Error deleting old transactions:', error);
      throw error;
    }
  }

  /**
   * Find transactions within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Number} limit - Max results
   * @returns {Promise<Array>} Transactions
   */
  async findByDateRange(startDate, endDate, limit = 1000) {
    try {
      const transactions = await Transaction.findAll({
        where: {
          createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10),
      });

      return transactions.map(t => t.toJSON());
    } catch (error) {
      logger.error('Error finding transactions by date range:', error);
      return [];
    }
  }

  /**
   * Find recent transactions
   * @param {Number} limit - Max results
   * @returns {Promise<Array>} Recent transactions
   */
  async findRecent(limit = 100) {
    try {
      const transactions = await Transaction.findAll({
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10),
      });

      return transactions.map(t => t.toJSON());
    } catch (error) {
      logger.error('Error finding recent transactions:', error);
      return [];
    }
  }
}

module.exports = new TransactionRepository();
