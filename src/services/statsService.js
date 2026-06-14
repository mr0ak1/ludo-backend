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

// Seeded random helper (Mulberry32) for deterministic 12-hour updates
function seedRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Aditya', 'Arjun', 'Vivaan', 'Vihaan', 'Sai', 'Reyansh', 'Krishna', 'Ishan', 'Shaurya',
  'Atharva', 'Shivaay', 'Ananya', 'Diya', 'Aaradhya', 'Shanaya', 'Anika', 'Myra', 'Ira', 'Sana',
  'Kunal', 'Rohit', 'Rahul', 'Sneha', 'Priya', 'Amit', 'Akash', 'Vijay', 'Deepak', 'Karan',
  'Ajay', 'Sanjay', 'Sunil', 'Anil', 'Manish', 'Raju', 'Vikas', 'Sandeep', 'Rakesh', 'Manoj',
  'Rajesh', 'Gaurav', 'Abhay', 'Harish', 'Suresh', 'Mahesh', 'Vikram', 'Pankaj', 'Sachin', 'Yash'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Mehta', 'Joshi', 'Kumar', 'Singh', 'Yadav', 'Prasad',
  'Mishra', 'Srivastava', 'Trivedi', 'Chaturvedi', 'Dixit', 'Nair', 'Rao', 'Reddy', 'Pillai', 'Iyer',
  'Das', 'Bose', 'Chatterjee', 'Mukherjee', 'Banerjee', 'Sen', 'Roy', 'Dutta', 'Chowdhury', 'Gill',
  'Dhillon', 'Sandhu', 'Grewal', 'Sidhu', 'Bajwa', 'Chawla', 'Malhotra', 'Kapoor', 'Khanna', 'Anand',
  'Sethi', 'Puri', 'Bajaj', 'Choudhary', 'Dubey', 'Pandey', 'Saxena', 'Deshmukh', 'Kulkarni', 'Joshi'
];

function generateLeaderboardEntries() {
  const entries = [];
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  const epoch = Math.floor(Date.now() / TWELVE_HOURS_MS);

  for (let i = 0; i < 500; i++) {
    // Generate deterministic name combinations that will not repeat in first 500
    const firstIndex = (i * 7) % INDIAN_FIRST_NAMES.length;
    const lastIndex = (i * 13) % INDIAN_LAST_NAMES.length;
    const name = `${INDIAN_FIRST_NAMES[firstIndex]} ${INDIAN_LAST_NAMES[lastIndex]}`;

    // Seeded random for stats fluctuation based on current 12-hour epoch and player index
    const playerSeed = epoch * 1000 + i;
    const rng = seedRandom(playerSeed);

    // Base stats: higher base for smaller i, lower base for larger i
    const baseWins = 500 - i * 0.95;
    const baseLosses = 250 - i * 0.45;
    const baseEarnings = Math.round((500 - i * 0.95) * 170);

    // Fluctuations to shuffle ranking every 12 hours (+/- 12%)
    const fluctuationPercent = (rng() * 24 - 12) / 100;
    const winsVar = Math.round(baseWins * fluctuationPercent * 0.3);
    const lossesVar = Math.round(baseLosses * fluctuationPercent * 0.3);
    const earningsVar = Math.round(baseEarnings * fluctuationPercent);

    const wins = Math.max(5, Math.round(baseWins + winsVar));
    const losses = Math.max(3, Math.round(baseLosses + lossesVar));
    const totalGames = wins + losses;
    const winRate = parseFloat((wins / totalGames).toFixed(4));
    const totalEarnings = Math.max(500, baseEarnings + earningsVar);

    // Dynamic avatar url
    const avatar = `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${encodeURIComponent(name)}`;

    entries.push({
      userId: `demo-user-${i}`,
      name,
      avatar,
      wins,
      totalWins: wins,
      losses,
      totalGames,
      winRate,
      rankPoints: totalEarnings,
      totalEarnings,
    });
  }

  // Sort descending by totalEarnings
  entries.sort((a, b) => b.totalEarnings - a.totalEarnings);

  // Assign correct ranks
  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));
}

function getUserRank(userId) {
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  const epoch = Math.floor(Date.now() / TWELVE_HOURS_MS);
  let userSeed = 0;
  const userIdStr = String(userId);
  for (let j = 0; j < userIdStr.length; j++) {
    userSeed = (userSeed * 31 + userIdStr.charCodeAt(j)) % 1000000;
  }
  const seed = epoch * 1000000 + userSeed;
  const rng = seedRandom(seed);
  return Math.floor(rng() * 601) + 200; // 200 to 800 inclusive
}

class StatsService {
  invalidateLeaderboardCache() {
    leaderboardCache = { computedAt: 0, entries: null };
  }

  async getLeaderboard() {
    const entries = generateLeaderboardEntries();
    return {
      leaderboard: entries,
      cached: false,
      cacheExpiresInMs: 0,
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
    const [gamesThisWeek, gamesThisMonth, gamesThisYear] = await Promise.all([
      matchHistoryRepository.countMatchesInRange(userId, startOfWeek, end),
      matchHistoryRepository.countMatchesInRange(userId, startOfMonth, end),
      matchHistoryRepository.countMatchesInRange(userId, startOfYear, end),
    ]);

    const currentRank = getUserRank(userId);

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
      unranked: false,
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

    const currentRank = getUserRank(targetUserId);
    const { startOfWeek, startOfMonth, startOfYear, end } = nowRangeBounds();
    const [gamesThisWeek, gamesThisMonth, gamesThisYear] = await Promise.all([
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfWeek, end),
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfMonth, end),
      matchHistoryRepository.countMatchesInRange(targetUserId, startOfYear, end),
    ]);

    return {
      ...formatPublicUser(target),
      currentRank,
      unranked: false,
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
