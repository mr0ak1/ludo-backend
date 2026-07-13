const userRepository = require('../repositories/userRepository');
const gameRepository = require('../repositories/gameRepository');
const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const matchHistoryRepository = require('../repositories/matchHistoryRepository');
const gameService = require('../services/gameService');
const walletService = require('../services/walletService');
const authService = require('../services/authService');
const matchmakingService = require('../services/matchmakingService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');
const config = require('../config/env');
const { generateToken } = require('../utils/generateToken');
const gameEvents = require('../utils/gameEvents');
const { SOCKET_EVENTS_SERVER_TO_CLIENT } = require('../constants/socket.constants');
const { TOKEN_COLORS, RANK_POINTS_LOSS } = require('../constants/stats.constants');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
/**
 * Admin login with username and password
 * POST /admin/login
 */
const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Username and password are required');
    }

    // Verify credentials from .env
    const envUsername = config.adminUsername;
    const envPassword = config.adminPassword;

    if (username !== envUsername || password !== envPassword) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid username or password');
    }

    // Find or create admin user
    let admin = await userRepository.findByEmail('admin@ludo.test');

    if (!admin) {
      // Create admin user if doesn't exist
      const User = require('../models/user.model');
      
      admin = await User.create({
        phone: `+919${Math.floor(Math.random() * 1000000000)}`,
        name: 'Ludo Admin',
        email: 'admin@ludo.test',
        isAdmin: true,
        coins: 10000,
      });

      admin = admin.toJSON();
      logger.info('Admin user created for login');
    }

    // Generate token
    const token = generateToken(admin._id, { isAdmin: true });

    logger.info(`Admin logged in: ${admin._id} with username: ${username}`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Admin login successful', {
        user: {
          userId: admin._id,
          name: admin.name,
          email: admin.email,
          isAdmin: admin.isAdmin,
        },
        token: token,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard analytics
 * GET /admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Get stats
    const totalUsers = await userRepository.countAllUsers();
    const bannedUsers = await userRepository.countBannedUsers();
    const suspendedUsers = await userRepository.countSuspendedUsers();
    const dailyActiveUsers = await userRepository.countDailyActiveUsers();

    // Get game stats
    const activeGames = await gameRepository.findByStatus('active', { limit: 1 });
    const totalGames = await gameRepository.countAllGames();

    // Get revenue stats (from transactions)
    const recentTransactions = await transactionRepository.findRecent(limit) || [];
    const totalRevenue = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const dashboardData = {
      users: {
        total: totalUsers,
        banned: bannedUsers,
        suspended: suspendedUsers,
        dailyActive: dailyActiveUsers,
      },
      games: {
        total: totalGames,
        active: activeGames?.total || 0,
      },
      revenue: {
        total: totalRevenue,
        recentTransactions: recentTransactions.slice(0, 5),
      },
      timestamp: new Date(),
    };

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Dashboard analytics retrieved', dashboardData)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with pagination and filters
 * GET /admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isBanned, isSuspended, sortBy } = req.query;

    const filters = {};
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';
    if (isSuspended !== undefined) filters.isSuspended = isSuspended === 'true';
    if (search) filters.search = search;
    if (sortBy) filters.sortBy = sortBy;

    const result = await userRepository.findAll(filters, { page: parseInt(page), limit: parseInt(limit) });

    // Fetch actual wallet balances
    const userIds = result.users.map(u => u._id);
    const Wallet = require('../models/wallet.model');
    const wallets = await Wallet.findAll({ where: { userId: { [Op.in]: userIds } } });
    const walletMap = {};
    wallets.forEach(w => { walletMap[w.userId.toString()] = w.coins; });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Users retrieved', {
        users: result.users.map(u => ({
          _id: u._id,
          phone: u.phone,
          name: u.name,
          email: u.email,
          coins: walletMap[u._id.toString()] !== undefined ? walletMap[u._id.toString()] : u.coins,
          totalGames: u.totalGames,
          winRate: u.winRate,
          isBanned: u.isBanned,
          isSuspended: u.isSuspended,
          createdAt: u.createdAt,
          lastActive: u.lastActive,
        })),
        pagination: {
          page: result.page,
          pages: result.pages,
          total: result.total,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user details
 * GET /admin/user/:id
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await userRepository.findById(id);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Get user's wallet, stats, and transactions
    const wallet = await walletRepository.findByUserId(id);
    const matchHistory = await matchHistoryRepository.findByParticipantUserId(id, { limit: 5 });
    
    // Fetch transaction and wallet stats
    const transactionRepository = require('../repositories/transactionRepository');
    const walletService = require('../services/walletService');
    const walletStats = await walletService.getWalletStats(id).catch(() => ({}));
    const transactions = await transactionRepository.findByUserId(id, { limit: 10 }, { excludeStatus: 'processing' }).catch(() => ({ transactions: [] }));

    const userData = {
      ...user,
      coins: wallet ? wallet.coins : user.coins,
      wallet: wallet || { coins: user.coins, isLocked: false },
      walletStats,
      recentTransactions: transactions.transactions || [],
      recentMatches: matchHistory?.items || [],
    };

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User details retrieved', userData)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all platform withdrawal requests
 * GET /admin/withdrawals
 */
const getAllWithdrawals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;
    const offset = (page - 1) * limit;

    const { Transaction, User } = require('../models');

    const where = { type: 'withdrawal' };
    if (req.query.status === 'history') {
      where.status = { [Op.in]: ['completed', 'failed', 'rejected', 'refunded'] };
    } else if (req.query.status) {
      where.status = req.query.status;
    } else {
      where.status = 'pending';
    }

    if (search) {
      const users = await User.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        attributes: ['id'],
      });
      const userIds = users.map(u => u.id);

      where[Op.or] = [
        { userId: { [Op.in]: userIds } },
        { reason: { [Op.like]: `%${search}%` } },
        { transactionId: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'phone', 'email', 'avatar'],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const withdrawalsMapped = rows.map(w => {
      const json = w.toJSON();
      const userObj = json.user;
      delete json.user;
      return {
        ...json,
        userId: userObj,
      };
    });

    res.status(200).json(
      new ApiResponse(200, 'All withdrawals retrieved', {
        withdrawals: withdrawalsMapped,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit) || 1,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a withdrawal request
 * POST /admin/withdrawals/:id/approve
 */
const approveWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Transaction } = require('../models');
    const transaction = await Transaction.findByPk(id);

    if (!transaction) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Transaction not found');
    if (transaction.type !== 'withdrawal') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Not a withdrawal transaction');
    if (transaction.status !== 'pending') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Withdrawal is already ' + transaction.status);

    transaction.status = 'completed';
    await transaction.save();

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Withdrawal approved successfully', transaction));
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a withdrawal request
 * POST /admin/withdrawals/:id/reject
 */
const rejectWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Transaction } = require('../models');
    const transaction = await Transaction.findByPk(id);

    if (!transaction) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Transaction not found');
    if (transaction.type !== 'withdrawal') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Not a withdrawal transaction');
    if (transaction.status !== 'pending') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Withdrawal is already ' + transaction.status);

    const walletService = require('../services/walletService');
    const originalAmount = transaction.metadata?.originalAmount || Math.abs(transaction.amount);
    await walletService.addCoins(transaction.userId, originalAmount, 'refund', 'Withdrawal Rejected Refund');

    transaction.status = 'failed';
    transaction.reason = transaction.reason + ' (Rejected by Admin)';
    await transaction.save();

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Withdrawal rejected and refunded successfully', transaction));
  } catch (error) {
    next(error);
  }
};

/**
 * Get all platform deposit requests
 * GET /admin/deposits
 */
const getAllDeposits = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;
    const offset = (page - 1) * limit;

    const { Transaction, User } = require('../models');

    const where = { type: 'deposit' };
    if (req.query.status === 'history') {
      where.status = { [Op.in]: ['completed', 'failed', 'rejected', 'refunded', 'reversed'] };
    } else if (req.query.status) {
      where.status = req.query.status;
    } else {
      where.status = 'pending';
    }

    if (search) {
      const users = await User.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        },
        attributes: ['id']
      });
      const userIds = users.map(u => u.id);

      where[Op.or] = [
        { userId: { [Op.in]: userIds } },
        sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.utr')) LIKE ${sequelize.escape('%' + search + '%')}`),
        { transactionId: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'phone', 'email', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const depositsMapped = rows.map(w => {
      const json = w.toJSON();
      const userObj = json.user;
      delete json.user;
      return {
        ...json,
        userId: userObj
      };
    });

    res.status(200).json(
      new ApiResponse(200, 'All deposits retrieved', {
        deposits: depositsMapped,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit) || 1
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a deposit request
 * POST /admin/deposits/:id/approve
 */
const approveDeposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Transaction } = require('../models');
    const transaction = await Transaction.findByPk(id);

    if (!transaction) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Transaction not found');
    if (transaction.type !== 'deposit') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Not a deposit transaction');
    if (transaction.status !== 'pending') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Deposit is already ' + transaction.status);

    const walletRepository = require('../repositories/walletRepository');
    
    const wallet = await walletRepository.findByUserId(transaction.userId);
    const previousBalance = wallet ? wallet.coins : 0;
    
    const updatedWallet = await walletRepository.addCoins(transaction.userId, transaction.amount, 'Deposit Approved by Admin');

    transaction.beforeBalance = previousBalance;
    transaction.afterBalance = updatedWallet.coins;
    transaction.status = 'completed';
    transaction.reason = 'Deposit Approved by Admin';
    await transaction.save();

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Deposit approved successfully', transaction));
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a deposit request
 * POST /admin/deposits/:id/reject
 */
const rejectDeposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Transaction } = require('../models');
    const transaction = await Transaction.findByPk(id);

    if (!transaction) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Transaction not found');
    if (transaction.type !== 'deposit') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Not a deposit transaction');
    if (transaction.status !== 'pending') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Deposit is already ' + transaction.status);

    transaction.status = 'failed';
    transaction.reason = transaction.reason + ' (Rejected by Admin)';
    await transaction.save();

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Deposit rejected successfully', transaction));
  } catch (error) {
    next(error);
  }
};

/**
 * Get user withdrawal history
 * GET /admin/user/:id/withdrawals
 */
const getUserWithdrawals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { Transaction } = require('../models');

    const { count, rows } = await Transaction.findAndCountAll({
      where: { userId: id, type: 'withdrawal' },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User withdrawals retrieved', {
        withdrawals: rows.map(r => r.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit) || 1,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Ban a user
 * POST /admin/ban-user
 */
const banUser = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId and reason are required');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    if (user.isBanned) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'User is already banned');
    }

    const bannedUser = await userRepository.banUser(userId, reason);

    logger.warn(`User ${userId} banned by admin. Reason: ${reason}`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User banned successfully', {
        userId: bannedUser._id,
        isBanned: bannedUser.isBanned,
        banReason: bannedUser.banReason,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Unban a user
 * POST /admin/unban-user
 */
const unbanUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId is required');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    if (!user.isBanned) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'User is not banned');
    }

    const unbannedUser = await userRepository.unbanUser(userId);

    logger.info(`User ${userId} unbanned by admin.`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User unbanned successfully', {
        userId: unbannedUser.id || unbannedUser._id,
        isBanned: unbannedUser.isBanned,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete a user and their data
 * DELETE /admin/user/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId is required');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Explicitly destroy related data to ensure clean deletion
    const { Transaction, Wallet, Notification, Queue } = require('../models');
    
    // Delete transactions
    await Transaction.destroy({ where: { userId: id } });
    
    // Delete notifications
    await Notification.destroy({ where: { userId: id } });
    
    // Delete from queue
    await Queue.destroy({ where: { userId: id } });

    // Delete wallet
    await Wallet.destroy({ where: { userId: id } });

    // Delete the user
    await userRepository.delete(id);

    logger.warn(`User ${id} permanently deleted by admin.`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User and associated data permanently deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend a user
 * POST /admin/suspend-user
 */
const suspendUser = async (req, res, next) => {
  try {
    const { userId, reason, duration } = req.body;

    if (!userId || !reason) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId and reason are required');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    if (user.isSuspended) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'User is already suspended');
    }

    const suspendedUser = await userRepository.suspendUser(userId, reason);

    logger.warn(`User ${userId} suspended by admin. Reason: ${reason}`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User suspended successfully', {
        userId: suspendedUser._id,
        isSuspended: suspendedUser.isSuspended,
        suspendReason: suspendedUser.suspendReason,
        duration: duration || 'indefinite',
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user withdraw capability
 * POST /admin/toggle-withdraw
 */
const toggleWithdraw = async (req, res, next) => {
  try {
    const { userId, disable } = req.body;
    if (!userId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId is required');

    const User = require('../models/user.model');
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

    user.isWithdrawDisabled = disable === true;
    await user.save();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, `User withdraw ${disable ? 'disabled' : 'enabled'} successfully`, {
        userId: user._id,
        isWithdrawDisabled: user.isWithdrawDisabled,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user gameplay capability
 * POST /admin/toggle-gameplay
 */
const toggleGameplay = async (req, res, next) => {
  try {
    const { userId, disable } = req.body;
    if (!userId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId is required');

    const User = require('../models/user.model');
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

    user.isGameplayDisabled = disable === true;
    await user.save();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, `User gameplay ${disable ? 'disabled' : 'enabled'} successfully`, {
        userId: user._id,
        isGameplayDisabled: user.isGameplayDisabled,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all games with filters
 * GET /admin/games
 */
const getAllGames = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, gameType, userId, search, player, playerId } = req.query;

    let query = {};
    if (gameType) query.gameType = gameType;
    
    // Support multiple common query parameters for finding user games
    const targetUserId = userId || search || player || playerId;
    if (targetUserId) {
      const numericUserId = parseInt(targetUserId, 10);
      if (!isNaN(numericUserId)) {
        query[Op.and] = [
          sequelize.literal(`JSON_CONTAINS(players, JSON_OBJECT('userId', ${numericUserId}))`)
        ];
      }
    }

    const games = await gameRepository.findByStatus(status || 'all', {
      page: parseInt(page),
      limit: parseInt(limit),
    }, query);

    // Fetch match history for completed games to get accurate winner data
    const gameIds = games.games
      ?.filter(g => g.status === 'completed' || g.status === 'surrendered' || g.status === 'cancelled')
      .map(g => g._id) || [];

    let matchHistoryMap = {};
    if (gameIds.length > 0) {
      try {
        const MatchHistory = require('../models/matchHistory.model');
        const histories = await MatchHistory.findAll({
          where: {
            gameId: { [Op.in]: gameIds }
          },
          raw: true
        });
        histories.forEach(h => {
          matchHistoryMap[h.gameId.toString()] = h;
        });
      } catch (e) {
        logger.error('Failed to fetch match histories for admin games list:', e.message);
      }
    }

    const formattedGames = games.games?.map(g => {
      // Try to get winner from: matchHistory > results.winner
      const history = matchHistoryMap[g._id.toString()];
      let winnerId = null;
      if (history?.winnerId) {
        winnerId = history.winnerId.toString();
      } else if (g.results?.winner) {
        winnerId = g.results.winner.toString();
      }

      // betAmount priority: game.betAmount (now correctly saved) > matchHistory.betAmount > game.entryFee
      const betAmount = g.betAmount || history?.betAmount || g.entryFee || 0;

      return {
        _id: g._id,
        gameId: g.gameId || g._id.toString(),
        status: g.status,
        type: g.gameType || g.type,
        betAmount,
        playerCount: g.players?.length || 0,
        players: g.players?.map(p => ({
          userId: p.userId?._id ? p.userId._id.toString() : (p.userId?.toString() || ''),
          color: p.playerColor || p.color,
          isBot: p.isBot || false,
          botDifficulty: p.botDifficulty,
        })) || [],
        winnerId,
        winners: winnerId ? [winnerId] : [],
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        endTime: g.endTime,
      };
    }) || [];

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Games retrieved', {
        games: formattedGames,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: games.total || 0,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get live/active games only
 * GET /admin/live-games
 */
const getLiveGames = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const liveGames = await gameRepository.findByStatus('active', { limit: 100 }); // Fetch more since we're filtering

    // Filter out games that are older than 30 minutes (likely stuck/orphaned)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const validLiveGames = (liveGames.games || []).filter(g => {
      const lastActive = g.updatedAt ? new Date(g.updatedAt) : new Date(g.createdAt);
      return lastActive > thirtyMinutesAgo;
    }).slice(0, parseInt(limit));

    const formattedGames = validLiveGames.map(g => ({
      _id: g._id,
      gameId: g.gameId,
      status: g.status,
      type: g.type,
      betAmount: g.betAmount,
      players: g.players?.map(p => ({
        userId: p.userId?._id || p.userId,
        playerName: p.playerName,
        playerColor: p.playerColor,
        isBot: p.isBot,
        botDifficulty: p.botDifficulty,
        joinedAt: p.joinedAt,
      })) || [],
      currentTurn: g.currentTurn,
      turnStartedAt: g.turnStartedAt,
      createdAt: g.createdAt,
    }));

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Live games retrieved', {
        games: formattedGames,
        count: formattedGames.length,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Force end a game
 * POST /admin/force-end-game
 */
const forceEndGame = async (req, res, next) => {
  try {
    const { gameId, reason } = req.body;

    if (!gameId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'gameId is required');
    }

    const game = await gameRepository.findById(gameId);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
    }

    if (game.status === 'completed' || game.status === 'cancelled') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Game is already ended');
    }

    // Update game status to cancelled
    const updatedGame = await gameRepository.update(gameId, {
      status: 'cancelled',
      endedBy: 'admin',
      cancelReason: reason || 'Force ended by admin',
    });

    const entryFee = game.entryFee || game.betAmount || 0;
    const isCashGame = (game.gameType || game.type) === 'cash' && entryFee > 0;
    const startedAt = game.startTime || game.startedAt || game.createdAt || new Date();
    const durationMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
    const totalMoves = Array.isArray(game.moves) ? game.moves.length : 0;

    // Build participants list for match history
    const participants = [];

    // Unlock wallets and count LOSS for all real (non-bot) players — NO refund
    for (let idx = 0; idx < game.players.length; idx++) {
      const player = game.players[idx];
      const uid = player.userId ? player.userId.toString() : null;
      if (!uid) continue;

      // Unlock wallet (was locked during game entry)
      if (!player.isBot) {
        try {
          await walletRepository.unlockWallet(uid);
          logger.info(`Wallet unlocked for user ${uid} after force-end of game ${gameId}`);
        } catch (unlockErr) {
          logger.error(`Failed to unlock wallet for user ${uid}:`, unlockErr.message);
        }

        // Count as LOSS — no refund for force-ended games
        try {
          const tokenColor = TOKEN_COLORS[idx % TOKEN_COLORS.length];
          await userRepository.updateGameStats(uid, {
            won: false,
            netCoinsWon: 0,
            netCoinsLost: isCashGame ? entryFee : 0,
            tokenColor,
            rankPointsDelta: -RANK_POINTS_LOSS,
          });
          logger.info(`Loss counted for user ${uid} after admin force-end of game ${gameId}`);
        } catch (statsErr) {
          logger.error(`Failed to update game stats for user ${uid}:`, statsErr.message);
        }

        participants.push({
          userId: Number(uid),
          isBot: false,
          playerColor: TOKEN_COLORS[idx % TOKEN_COLORS.length],
          placement: idx + 2, // all losers, no winner
          coinsWon: 0,
          coinsLost: isCashGame ? entryFee : 0,
        });
      }
    }

    // Record match history
    try {
      await matchHistoryRepository.create({
        gameId: game._id,
        gameType: game.gameType || game.type || 'cash',
        betAmount: entryFee,
        duration: durationMs,
        totalMoves,
        participants,
        winnerId: null, // no winner in force-ended game
        startedAt: new Date(startedAt),
        endedAt: new Date(),
      });
    } catch (histErr) {
      logger.error('Failed to record match history for force-ended game:', histErr.message);
    }

    // Emit GAME_ENDED socket event — clients will navigate to result screen (no rejoin)
    gameEvents.emit(SOCKET_EVENTS_SERVER_TO_CLIENT.GAME_ENDED, {
      gameId,
      status: 'cancelled',
      reason: reason || 'Force ended by admin',
      endedBy: 'admin',
    });

    logger.warn(`Game ${gameId} force ended by admin. Reason: ${reason}. Loss counted for all human players.`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game ended successfully', {
        gameId: updatedGame._id,
        status: updatedGame.status,
        reason: reason || 'Force ended by admin',
        humanPlayersLossed: participants.length,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust wallet (add/deduct coins)
 * POST /admin/wallet-adjustment
 */
const adjustWallet = async (req, res, next) => {
  try {
    const { userId, amount, type, reason } = req.body;

    if (!userId || amount === undefined || !type) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'userId, amount, and type are required');
    }

    if (!['add', 'deduct'].includes(type)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'type must be "add" or "deduct"');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    let result;
    if (type === 'add') {
      result = await walletService.addCoins(userId, amount, 'admin_adjustment', reason);
    } else {
      result = await walletService.deductCoins(userId, amount, 'admin_deduction', reason);
    }

    logger.warn(`Wallet adjusted for user ${userId}. Type: ${type}, Amount: ${amount}, Reason: ${reason}`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Wallet adjusted successfully', {
        userId: result.userId,
        balance: result.balance,
        adjustmentAmount: amount,
        type: type,
        reason: reason,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set global bot difficulty level
 * POST /admin/set-difficulty
 */
const setBotDifficulty = async (req, res, next) => {
  try {
    const { difficulty } = req.body;

    if (!difficulty) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Difficulty level is required');
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty.toLowerCase())) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }

    // Set the global bot difficulty
    await matchmakingService.setGlobalBotDifficulty(difficulty.toLowerCase());

    const currentDifficulty = matchmakingService.getGlobalBotDifficulty();

    logger.info(`Bot difficulty changed to: ${difficulty} by admin`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Bot difficulty updated successfully', {
        difficulty: currentDifficulty,
        appliedToNewGames: true,
        message: `All new games will now use ${difficulty} difficulty bots`,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set threshold for auto hard mode
 * POST /admin/set-hard-mode-threshold
 */
const setHardModeThreshold = async (req, res, next) => {
  try {
    const { threshold } = req.body;

    if (threshold !== null && (typeof threshold !== 'number' || threshold < 0)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Threshold must be a positive number or null');
    }

    await matchmakingService.setHardModeThreshold(threshold);

    logger.info(`Auto hard mode threshold updated to: ${threshold} by admin`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Auto hard mode threshold updated successfully', {
        threshold: matchmakingService.getHardModeThreshold(),
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set bot difficulty for a specific live game
 * POST /admin/set-game-difficulty
 */
const setGameDifficulty = async (req, res, next) => {
  try {
    const { gameId, difficulty } = req.body;

    if (!gameId || !difficulty) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'gameId and difficulty are required');
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty.toLowerCase())) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }

    // Find the game
    const game = await gameRepository.findById(gameId);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
    }

    // Check if game is active/live
    if (game.status !== 'active' && game.status !== 'ongoing') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Can only change difficulty for active/ongoing games');
    }

    // Update all bot players in the game with new difficulty
    let botsUpdated = 0;
    game.players.forEach((player) => {
      if (player.isBot) {
        player.botDifficulty = difficulty.toLowerCase();
        botsUpdated++;
      }
    });

    if (botsUpdated === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No bot players found in this game');
    }

    // Save the updated game
    await gameRepository.update(gameId, {
      players: game.players,
    });

    logger.info(`Game ${gameId} bot difficulty changed to ${difficulty} by admin. Bots updated: ${botsUpdated}`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Bot difficulty updated for game', {
        gameId,
        difficulty: difficulty.toLowerCase(),
        botsUpdated,
        message: `${botsUpdated} bot(s) in game updated to ${difficulty} difficulty`,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current bot difficulty level
 * GET /admin/get-difficulty
 */
const getBotDifficulty = async (req, res, next) => {
  try {
    const currentDifficulty = matchmakingService.getGlobalBotDifficulty();
    const hardModeThreshold = matchmakingService.getHardModeThreshold();
    const BotConfig = require('../models/botConfig.model');
    const config = await BotConfig.findOne();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Current bot difficulty retrieved', {
        difficulty: currentDifficulty,
        hardModeThreshold: hardModeThreshold,
        minimumBet: config && config.minimumBet !== undefined ? config.minimumBet : 10,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set minimum bet for cash games
 * POST /admin/set-minimum-bet
 */
const setMinimumBet = async (req, res, next) => {
  try {
    const { minimumBet } = req.body;

    if (minimumBet === undefined || typeof minimumBet !== 'number' || minimumBet < 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Minimum bet must be a positive number');
    }

    const BotConfig = require('../models/botConfig.model');
    let config = await BotConfig.findOne();
    if (!config) {
      config = new BotConfig({ minimumBet });
    } else {
      config.minimumBet = minimumBet;
    }
    await config.save();

    logger.info(`Minimum bet updated to: ${minimumBet} by admin`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Minimum bet updated successfully', {
        minimumBet: config.minimumBet,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue analytics
 * GET /admin/revenue
 */
const getRevenue = async (req, res, next) => {
  try {
    const { days = 7, groupBy = 'day' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Calculate admin P&L directly from MatchHistory
    // Admin P&L per game = sum(human.coinsLost) - sum(human.coinsWon)
    //   Bot wins  → +entryFee  (admin kept user's coins)
    //   Human wins → entryFee - rewardAmount = negative (admin paid out net reward)
    const MatchHistory = require('../models/matchHistory.model');
    const histories = await MatchHistory.findAll({
      where: {
        gameType: 'cash',
        endedAt: {
          [Op.gte]: startDate,
          [Op.lte]: new Date()
        }
      },
      raw: true
    });

    const grouped = {};

    const getKey = (date) => {
      const d = new Date(date);
      if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        return d.toISOString().substring(0, 7);
      }
      return d.toISOString().split('T')[0]; // default: day
    };

    for (const history of histories) {
      const key = getKey(history.endedAt || history.createdAt);

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          total: 0,       // admin net P&L for this period
          profit: 0,      // admin gains (bot wins)
          loss: 0,        // admin losses (human wins)
          count: 0,       // total games
          botWins: 0,
          humanWins: 0,
        };
      }

      grouped[key].count += 1;

      // Calculate admin P&L for this game
      let adminPnL = 0;
      let humanWon = false;

      for (const p of history.participants || []) {
        if (p.isBot) continue; // skip bots — virtual money
        // For each HUMAN participant:
        // coinsLost = what they paid in (entry fee) — admin received this
        // coinsWon  = what they received as reward  — admin paid this out
        adminPnL += (p.coinsLost || 0) - (p.coinsWon || 0);
        if ((p.coinsWon || 0) > 0) humanWon = true;
      }

      grouped[key].total += adminPnL;
      if (humanWon) {
        grouped[key].loss += Math.abs(Math.min(0, adminPnL));
        grouped[key].humanWins += 1;
      } else {
        grouped[key].profit += Math.max(0, adminPnL);
        grouped[key].botWins += 1;
      }
    }

    const breakdown = Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalRevenue = breakdown.reduce((sum, r) => sum + r.total, 0);
    const totalGames = breakdown.reduce((sum, r) => sum + r.count, 0);
    const totalProfit = breakdown.reduce((sum, r) => sum + r.profit, 0);
    const totalLoss = breakdown.reduce((sum, r) => sum + r.loss, 0);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Revenue analytics retrieved', {
        period: `Last ${days} days`,
        groupedBy: groupBy,
        summary: {
          totalRevenue,      // net P&L (can be negative if users won more)
          totalTransactions: totalGames,
          averagePerDay: totalRevenue / parseInt(days),
          totalProfit,       // sum of gains (bot wins)
          totalLoss,         // sum of losses (human wins)
          totalGames,
        },
        breakdown,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction summary (deposits vs withdrawals)
 * GET /admin/transaction-summary
 */
const getTransactionSummary = async (req, res, next) => {
  try {
    const { days } = req.query; // '1', '7', '30', or 'all'
    const query = {};
    
    if (days && days !== 'all') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.createdAt = { [Op.gte]: startDate, [Op.lte]: new Date() };
    }

    const { Transaction } = require('../models');
    
    const transactions = await Transaction.findAll({
      where: query,
      raw: true
    });
    
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    
    for (const t of transactions) {
      if (['deposit', 'admin_add', 'sign_up_bonus', 'referral_bonus', 'daily_bonus'].includes(t.type)) {
        totalDeposit += Math.abs(t.amount);
      } else if (['withdrawal', 'admin_deduct'].includes(t.type)) {
        totalWithdrawal += Math.abs(t.amount);
      }
    }
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Transaction summary retrieved', {
        totalDeposit,
        totalWithdrawal,
        netRevenue: totalDeposit - totalWithdrawal
      })
    );
  } catch (error) {
    next(error);
  }
};
/**
 * Get live statistics (users online, playing, gameplay amount, total balance)
 * GET /admin/live-stats
 */
const getLiveStats = async (req, res, next) => {
  try {
    // 1. App open users (Socket connections)
    const io = req.app.get('io');
    const appOpenUsers = io && io.engine ? io.engine.clientsCount : 0;

    // 2. Users playing game live
    const playingUsers = await gameRepository.getLivePlayingUsersCount();

    // 3. Today's total game play amount
    const todayGameplayAmount = await gameRepository.getTodayGameplayAmount();

    // 4. Total user balance combined
    const totalUserBalance = await walletRepository.getTotalSystemBalance();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Live stats retrieved', {
        appOpenUsers,
        playingUsers,
        todayGameplayAmount,
        totalUserBalance,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get probability manager configuration
 * GET /admin/probability-config
 */
const getProbabilityConfig = async (req, res, next) => {
  try {
    const probabilityService = require('../services/probabilityService');
    const config = await probabilityService.getConfig();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Probability configuration retrieved', config)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Set probability manager configuration
 * POST /admin/probability-config
 */
const setProbabilityConfig = async (req, res, next) => {
  try {
    const { winProbability, enabled, forceOverrideBotManagement } = req.body;
    const probabilityService = require('../services/probabilityService');
    
    const AdminLog = require('../models/adminLog.model');
    const adminId = req.user ? (req.user.userId || req.user.id || req.user._id) : null;

    const data = {};
    if (winProbability !== undefined) data.winProbability = Number(winProbability);
    if (enabled !== undefined) data.enabled = Boolean(enabled);
    if (forceOverrideBotManagement !== undefined) data.forceOverrideBotManagement = Boolean(forceOverrideBotManagement);

    const config = await probabilityService.setConfig(data);
    
    // Audit Log
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'UPDATE_PROBABILITY_CONFIG',
        changes: data,
        reason: 'Probability config updated',
      });
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Probability configuration updated', config)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Send Push Notification
 * POST /admin/send-notification
 */
  const sendNotification = async (req, res, next) => {
    try {
      const { title, body, userId, type } = req.body;
      
      if (!title || !body) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Title and body are required');
      }
  
      const { sendMulticastNotification } = require('../config/firebase');
      const AdminLog = require('../models/adminLog.model');
      const User = require('../models/user.model'); // trigger restart
      
      const where = { isBot: false };
      if (userId) {
        where.id = userId;
      }
      where[Op.and] = [
        sequelize.literal("JSON_TYPE(deviceTokens) = 'ARRAY'"),
        sequelize.literal("JSON_LENGTH(deviceTokens) > 0")
      ];
  
      // Get users with device tokens
      const users = await User.findAll({
        where,
        attributes: ['deviceTokens']
      });
      
      // Extract all tokens into a single array
      const tokens = users.reduce((acc, user) => [...acc, ...(user.deviceTokens || [])], []);
  
      if (tokens.length === 0) {
        return res.status(HTTP_STATUS.OK).json(
          new ApiResponse(HTTP_STATUS.OK, 'No users found with valid device tokens.', { successCount: 0, failureCount: 0 })
        );
      }
  
      const notificationType = type === 'popup' ? 'IN_APP_POPUP' : 'admin_broadcast';
  
      let result = { successCount: 0, failureCount: 0, invalidTokens: [] };
      
      if (type === 'popup') {
        const Popup = require('../models/popup.model');
        // Deactivate older popups
        await Popup.update({ isActive: false }, { where: {} });
        // Create new popup
        await Popup.create({ title, body, isActive: true });
        
        // We still send a silent push so active users get it immediately
        result = await sendMulticastNotification(tokens, {
          title: '', // Empty title prevents system notification
          body: '',
          data: { type: notificationType, timestamp: String(Date.now()), isPopup: "true" }
        });
      } else {
        // Send push notifications
        result = await sendMulticastNotification(tokens, {
          title,
          body,
          data: { type: notificationType, timestamp: String(Date.now()) }
        });
      }

    // Audit Log
    if (req.user) {
      await AdminLog.create({
        adminId: req.user.userId || req.user.id || req.user._id,
        action: 'SEND_NOTIFICATION',
        changes: { title, body, userId, type, targetCount: tokens.length, successCount: result.successCount },
        reason: 'Admin broadcast message',
      });
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Notifications sent successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Notification History
 * GET /admin/notification-history
 */
const getNotificationHistory = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const AdminLog = require('../models/adminLog.model');

    const where = { action: 'SEND_NOTIFICATION' };
    if (type) {
      if (type === 'push') {
        where[Op.or] = [
          sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(changes, '$.type')) = 'push'`),
          sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(changes, '$.type')) IS NULL`)
        ];
      } else {
        where[Op.and] = [
          sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(changes, '$.type')) = ${sequelize.escape(type)}`)
        ];
      }
    }

    const { count, rows } = await AdminLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      limit: parseInt(limit, 10),
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Notification history retrieved', {
        history: rows.map(r => r.toJSON()),
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: count
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ================= LOBBY GAMES MANAGEMENT =================

const LobbyGame = require('../models/lobbyGame.model');

const getLobbyGames = async (req, res, next) => {
  try {
    const games = await LobbyGame.findAll({
      order: [['entryFee', 'ASC']],
    });
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby games retrieved', games.map(g => {
        const data = g.toJSON();
        data.prizeAmount = data.entryFee * (data.maxPlayers || 2);
        return data;
      }))
    );
  } catch (error) {
    next(error);
  }
};

const createLobbyGame = async (req, res, next) => {
  try {
    const { entryFee, maxPlayers, isActive } = req.body;
    if (entryFee === undefined) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'entryFee is required');
    }

    const calculatedPrizeAmount = entryFee * (maxPlayers || 2);
    const game = await LobbyGame.create({ entryFee, prizeAmount: calculatedPrizeAmount, maxPlayers, isActive });
    
    if (game.isActive) {
      const notificationService = require('../services/notificationService');
      const title = '🎮 New Mega Challenge!';
      const body = `Entry prize etna hai: ₹${game.entryFee} and winning etna hai: ₹${game.prizeAmount}. Join and play it now!`;
      notificationService.notifyAllUsers(title, body, 'system_alert', { lobbyGameId: game._id }).catch(e => logger.error('Push error:', e));
    }

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Lobby game created', game.toJSON())
    );
  } catch (error) {
    next(error);
  }
};

const updateLobbyGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { entryFee, maxPlayers, isActive } = req.body;
    
    const game = await LobbyGame.findByPk(id);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Lobby game not found');
    }

    const finalEntryFee = entryFee !== undefined ? entryFee : game.entryFee;
    const finalMaxPlayers = maxPlayers !== undefined ? maxPlayers : game.maxPlayers;
    const calculatedPrizeAmount = finalEntryFee * (finalMaxPlayers || 2);
    await game.update({ entryFee, prizeAmount: calculatedPrizeAmount, maxPlayers, isActive });

    if (game.isActive) {
      const notificationService = require('../services/notificationService');
      const title = '🔥 Challenge Updated!';
      const body = `Entry prize etna hai: ₹${game.entryFee} and winning etna hai: ₹${game.prizeAmount}. Join and play it now!`;
      notificationService.notifyAllUsers(title, body, 'system_alert', { lobbyGameId: game._id }).catch(e => logger.error('Push error:', e));
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby game updated', game.toJSON())
    );
  } catch (error) {
    next(error);
  }
};

const deleteLobbyGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await LobbyGame.findByPk(id);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Lobby game not found');
    }

    await game.destroy();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby game deleted')
    );
  } catch (error) {
    next(error);
  }
};

const BotConfig = require('../models/botConfig.model');

const getReferralConfig = async (req, res, next) => {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await BotConfig.create({});
    }
    
      res.status(HTTP_STATUS.OK).json(
        new ApiResponse(HTTP_STATUS.OK, 'Referral config retrieved', {
          referrerBonus: config.referrerBonus,
          referredBonus: config.referredBonus,
          signUpBonus: config.signUpBonus
        })
      );
  } catch (error) {
    next(error);
  }
};

const setReferralConfig = async (req, res, next) => {
  try {
    const { referrerBonus, referredBonus } = req.body;
    let config = await BotConfig.findOne();
    if (!config) {
      config = new BotConfig();
    }
    
    if (referrerBonus !== undefined) config.referrerBonus = Number(referrerBonus);
    if (referredBonus !== undefined) config.referredBonus = Number(referredBonus);
    if (req.body.signUpBonus !== undefined) config.signUpBonus = Number(req.body.signUpBonus);
    
    await config.save();
    
      res.status(HTTP_STATUS.OK).json(
        new ApiResponse(HTTP_STATUS.OK, 'Referral config updated successfully', {
          referrerBonus: config.referrerBonus,
          referredBonus: config.referredBonus,
          signUpBonus: config.signUpBonus
        })
      );
  } catch (error) {
    next(error);
  }
};

const getPaymentGatewayConfig = async (req, res, next) => {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await BotConfig.create({});
    }
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Payment gateway config retrieved', {
        paymentGatewayKey: config.paymentGatewayKey || '',
        upiId: config.upiId || '',
        paytmMerchantId: config.paytmMerchantId || ''
      })
    );
  } catch (error) {
    next(error);
  }
};

const setPaymentGatewayConfig = async (req, res, next) => {
  try {
    const { paymentGatewayKey, upiId, paytmMerchantId } = req.body;
    let config = await BotConfig.findOne();
    if (!config) {
      config = new BotConfig();
    }
    
    if (paymentGatewayKey !== undefined) config.paymentGatewayKey = String(paymentGatewayKey);
    if (upiId !== undefined) config.upiId = String(upiId);
    if (paytmMerchantId !== undefined) config.paytmMerchantId = String(paytmMerchantId);
    
    await config.save();
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Payment gateway config updated successfully', {
        paymentGatewayKey: config.paymentGatewayKey,
        upiId: config.upiId,
        paytmMerchantId: config.paytmMerchantId
      })
    );
  } catch (error) {
    next(error);
  }
};

const getSupportConfig = async (req, res, next) => {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await BotConfig.create({});
    }
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Support config retrieved', {
        whatsappNumber: config.whatsappNumber || ''
      })
    );
  } catch (error) {
    next(error);
  }
};

const setSupportConfig = async (req, res, next) => {
  try {
    const { whatsappNumber } = req.body;
    let config = await BotConfig.findOne();
    if (!config) {
      config = new BotConfig();
    }
    
    if (whatsappNumber !== undefined) config.whatsappNumber = String(whatsappNumber);
    
    await config.save();
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Support config updated successfully', {
        whatsappNumber: config.whatsappNumber
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminLogin,
  getDashboard,
  getAllUsers,
  getUser,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getUserWithdrawals,
  banUser,
  suspendUser,
  getAllGames,
  getLiveGames,
  forceEndGame,
  adjustWallet,
  setBotDifficulty,
  setHardModeThreshold,
  setGameDifficulty,
  getBotDifficulty,
  setMinimumBet,
  getRevenue,
  getTransactionSummary,
  getLiveStats,
  toggleWithdraw,
  toggleGameplay,
  getProbabilityConfig,
  setProbabilityConfig,
  sendNotification,
  getNotificationHistory,
  getLobbyGames,
  createLobbyGame,
  updateLobbyGame,
  deleteLobbyGame,
  getReferralConfig,
  getAllDeposits,
  approveDeposit,
  rejectDeposit,
  setReferralConfig,
  getPaymentGatewayConfig,
  setPaymentGatewayConfig,
  getSupportConfig,
  setSupportConfig,
  deleteUser,
  unbanUser,
};
