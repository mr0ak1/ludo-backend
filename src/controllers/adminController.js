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
const mongoose = require('mongoose');
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
      
      admin = new User({
        phone: `+919${Math.floor(Math.random() * 1000000000)}`,
        name: 'Ludo Admin',
        email: 'admin@ludo.test',
        isAdmin: true,
        coins: 10000,
      });

      await admin.save();
      admin = admin.toObject();
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
    const wallets = await Wallet.find({ userId: { $in: userIds } });
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
    const transactions = await transactionRepository.findByUserId(id, { limit: 10 }).catch(() => ({ transactions: [] }));

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
    const skip = (page - 1) * limit;

    const Transaction = require('../models/transaction.model');
    // Only fetch pending withdrawal requests
    const query = { type: 'withdrawal', status: 'pending' };
    
    if (search) {
      const User = require('../models/user.model');
      const searchRegex = new RegExp(search, 'i');
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      
      query.$or = [
        { userId: { $in: userIds } },
        { reason: searchRegex },
        { transactionId: searchRegex }
      ];
    }
    
    const withdrawals = await Transaction.find(query)
      .populate('userId', 'name phone email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    const ApiResponse = require('../utils/apiResponse');
    res.status(200).json(
      new ApiResponse(200, 'All withdrawals retrieved', {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
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
    const Transaction = require('../models/transaction.model');
    const transaction = await Transaction.findById(id);

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
    const Transaction = require('../models/transaction.model');
    const transaction = await Transaction.findById(id);

    if (!transaction) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Transaction not found');
    if (transaction.type !== 'withdrawal') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Not a withdrawal transaction');
    if (transaction.status !== 'pending') throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Withdrawal is already ' + transaction.status);

    const walletService = require('../services/walletService');
    await walletService.addCoins(transaction.userId, Math.abs(transaction.amount), 'refund', 'Withdrawal Rejected Refund');

    transaction.status = 'failed';
    transaction.reason = transaction.reason + ' (Rejected by Admin)';
    await transaction.save();

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Withdrawal rejected and refunded successfully', transaction));
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
    const skip = (page - 1) * limit;

    const transactionRepository = require('../repositories/transactionRepository');
    const Transaction = require('../models/transaction.model');

    const query = { userId: id, type: 'withdrawal' };
    const withdrawals = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'User withdrawals retrieved', {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
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
    const user = await User.findById(userId);
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
    const user = await User.findById(userId);
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
      query['players.userId'] = targetUserId;
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
        const mongoose = require('mongoose');
        const histories = await MatchHistory.find({
          gameId: { $in: gameIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();
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

    const liveGames = await gameRepository.findByStatus('active', { limit: parseInt(limit) });

    const formattedGames = liveGames.games?.map(g => ({
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
    })) || [];

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
          userId: new mongoose.Types.ObjectId(uid),
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
    const histories = await MatchHistory.find({
      gameType: 'cash',
      endedAt: { $gte: startDate, $lte: new Date() },
    }).lean();

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
      query.createdAt = { $gte: startDate, $lte: new Date() };
    }

    const Transaction = require('../models/transaction.model');
    
    const transactions = await Transaction.find(query).lean();
    
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
      
      let query = { deviceTokens: { $exists: true, $not: { $size: 0 } }, isBot: false };
      if (userId) {
        query._id = userId;
      }
  
      // Get users with device tokens
      const users = await User.find(query, 'deviceTokens');
      
      // Extract all tokens into a single array
      const tokens = users.reduce((acc, user) => [...acc, ...user.deviceTokens], []);
  
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
        await Popup.updateMany({}, { isActive: false });
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

    const query = { action: 'SEND_NOTIFICATION' };
    
    const logs = await AdminLog.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    // Filter by type if provided (type is inside changes.type)
    let filteredLogs = logs;
    if (type) {
      filteredLogs = logs.filter(log => {
        const logType = log.changes?.type || 'push'; // Default to push for older logs
        return logType === type;
      });
    }

    const total = await AdminLog.countDocuments(query);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Notification history retrieved', {
        history: filteredLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
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
    const games = await LobbyGame.find().sort({ entryFee: 1 }).lean();
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby games retrieved', games)
    );
  } catch (error) {
    next(error);
  }
};

const createLobbyGame = async (req, res, next) => {
  try {
    const { entryFee, prizeAmount, maxPlayers, isActive } = req.body;
    if (entryFee === undefined || prizeAmount === undefined) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'entryFee and prizeAmount are required');
    }

    const game = await LobbyGame.create({ entryFee, prizeAmount, maxPlayers, isActive });
    
    if (game.isActive) {
      const notificationService = require('../services/notificationService');
      const title = '🎮 New Mega Challenge!';
      const body = `Entry prize etna hai: ₹${game.entryFee} and winning etna hai: ₹${game.prizeAmount}. Join and play it now!`;
      notificationService.notifyAllUsers(title, body, 'system_alert', { lobbyGameId: game._id }).catch(e => logger.error('Push error:', e));
    }

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Lobby game created', game)
    );
  } catch (error) {
    next(error);
  }
};

const updateLobbyGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { entryFee, prizeAmount, maxPlayers, isActive } = req.body;
    
    const game = await LobbyGame.findByIdAndUpdate(
      id,
      { entryFee, prizeAmount, maxPlayers, isActive },
      { new: true, runValidators: true }
    );

    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Lobby game not found');
    }

    if (game.isActive) {
      const notificationService = require('../services/notificationService');
      const title = '🔥 Challenge Updated!';
      const body = `Entry prize etna hai: ₹${game.entryFee} and winning etna hai: ₹${game.prizeAmount}. Join and play it now!`;
      notificationService.notifyAllUsers(title, body, 'system_alert', { lobbyGameId: game._id }).catch(e => logger.error('Push error:', e));
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby game updated', game)
    );
  } catch (error) {
    next(error);
  }
};

const deleteLobbyGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const game = await LobbyGame.findByIdAndDelete(id);

    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Lobby game not found');
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Lobby game deleted')
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
};
