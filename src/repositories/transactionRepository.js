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
      const transaction = new Transaction(transactionData);
      await transaction.save(options);
      logger.info(`Transaction created for user: ${transactionData.userId}, Type: ${transactionData.type}`);
      return transaction.toObject();
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   * @param {String} transactionId - Transaction ID
   * @returns {Promise<Object|null>} Transaction object or null
   */
  async findById(transactionId) {
    try {
      const transaction = await Transaction.findById(transactionId).select('-__v');
      return transaction ? transaction.toObject() : null;
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Find transactions by user ID with pagination
   * @param {String} userId - User ID
   * @param {Object} pagination - Pagination options (page, limit)
   * @param {Object} filters - Additional filters (type, startDate, endDate)
   * @returns {Promise<Object>} Transactions and total count
   */
  async findByUserId(userId, pagination = {}, filters = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const query = { userId };

      // Filter by transaction type
      if (filters.type) {
        query.type = filters.type;
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      // Filter by amount range
      if (filters.minAmount !== undefined) {
        query.amount = { $gte: filters.minAmount };
      }
      if (filters.maxAmount !== undefined) {
        query.amount = { ...(query.amount || {}), $lte: filters.maxAmount };
      }

      const transactions = await Transaction.find(query)
        .select('-__v')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await Transaction.countDocuments(query);

      return {
        transactions: transactions.map(t => t.toObject()),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for user
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recent transactions
   * @returns {Promise<Array>} Recent transactions
   */
  async getRecentTransactions(userId, limit = 10) {
    try {
      const transactions = await Transaction.find({ userId })
        .select('-__v')
        .limit(limit)
        .sort({ createdAt: -1 });

      return transactions.map(t => t.toObject());
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary by type
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Summary by transaction type
   */
  async getTransactionSummary(userId) {
    try {
      const summary = await Transaction.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      const result = {};
      summary.forEach(item => {
        result[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
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
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Earnings and spending totals
   */
  async getUserCoinStats(userId) {
    try {
      const stats = await Transaction.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: {
                $cond: [{ $gt: ['$amount', 0] }, '$amount', 0],
              },
            },
            totalSpent: {
              $sum: {
                $cond: [{ $lt: ['$amount', 0] }, { $abs: ['$amount'] }, 0],
              },
            },
            transactionCount: { $sum: 1 },
          },
        },
      ]);

      return stats[0] || {
        totalEarned: 0,
        totalSpent: 0,
        transactionCount: 0,
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

      const query = {};
      if (filters.type) query.type = filters.type;
      if (filters.userId) query.userId = filters.userId;
      if (filters.reason) {
        query.reason = { $regex: filters.reason, $options: 'i' };
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const transactions = await Transaction.find(query)
        .select('-__v')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await Transaction.countDocuments(query);

      return {
        transactions: transactions.map(t => t.toObject()),
        total,
        page,
        pages: Math.ceil(total / limit),
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

      const result = await Transaction.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(`Deleted ${result.deletedCount} old transactions older than ${days} days`);
      return result;
    } catch (error) {
      logger.error('Error deleting old transactions:', error);
      throw error;
    }
  }
}

module.exports = new TransactionRepository();
