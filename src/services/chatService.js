const chatRepository = require('../repositories/chatRepository');
const gameRepository = require('../repositories/gameRepository');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const {
  CHAT_MESSAGES,
  CHAT_LIMITS,
  CHAT_TYPE,
  PROFANITY_WORDS,
  URL_SUBSTRINGS_BLOCKED,
} = require('../constants/chat.constants');
const logger = require('../utils/logger');

const TERMINAL_GAME_STATUSES = ['completed', 'cancelled', 'surrendered'];

const _isValidGameId = (gameId) => {
  if (typeof gameId === 'number') return true;
  if (typeof gameId !== 'string') return false;
  return gameId.length === 16 || /^[0-9a-fA-F]{24}$/.test(gameId) || /^\d+$/.test(gameId);
};

/** @type {Map<string, { count: number, windowStart: number }>} */
const userGameRateLimitMap = new Map();

const _rateKey = (userId, gameId) => `${userId}:${gameId}`;

const _checkRateLimit = (userId, gameId) => {
  const now = Date.now();
  const key = _rateKey(userId, gameId);
  const entry = userGameRateLimitMap.get(key);

  if (!entry) {
    userGameRateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (now - entry.windowStart > CHAT_LIMITS.RATE_LIMIT_WINDOW_MS) {
    userGameRateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= CHAT_LIMITS.RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }

  entry.count += 1;
  return true;
};

const _playerId = (p) => {
  if (!p) return null;
  const val = p.userId ?? p.playerId;
  if (!val) return null;
  if (typeof val === 'object' && val._id) {
    return val._id;
  }
  return val;
};

const _isUserInGame = (game, userId) => {
  const uid = userId.toString();
  return game.players.some((p) => {
    const id = _playerId(p);
    return id && id.toString() === uid;
  });
};

const _playerNameForUser = (game, userId) => {
  const p = game.players.find((pl) => {
    const id = _playerId(pl);
    return id && id.toString() === userId.toString();
  });
  return p?.playerName || 'Player';
};

const _containsBlockedUrl = (text) => {
  const lower = text.toLowerCase();
  return URL_SUBSTRINGS_BLOCKED.some((s) => lower.includes(s));
};

const _applyProfanityFilter = (text) => {
  let out = text;
  let hit = false;
  for (const word of PROFANITY_WORDS) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (re.test(out)) {
      hit = true;
      out = out.replace(re, '***');
    }
  }
  return { text: out, profanityStripped: hit };
};

class ChatService {
  /**
   * Normalize and validate raw message text (length, URLs).
   * @param {string} raw
   * @returns {{ displayMessage: string, messageType: string }}
   */
  prepareMessageContent(raw) {
    if (raw === undefined || raw === null) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Message is required');
    }

    const trimmed = String(raw).trim();
    if (trimmed.length < CHAT_LIMITS.MIN_MESSAGE_LENGTH) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Message is too short');
    }
    if (trimmed.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Message must be at most ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters`
      );
    }

    if (_containsBlockedUrl(trimmed)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'URLs are not allowed in chat');
    }

    const isQuick = CHAT_MESSAGES.includes(trimmed);
    const { text: afterProfanity } = _applyProfanityFilter(trimmed);

    return {
      displayMessage: afterProfanity,
      messageType: isQuick ? CHAT_TYPE.QUICK_MESSAGE : CHAT_TYPE.TEXT_MESSAGE,
    };
  }

  /**
   * @param {import('socket.io').Server} io
   * @param {{ gameId: string, userId: string, playerName?: string, message: string }} input
   */
  async sendUserMessage(io, input) {
    const { gameId, userId, message } = input;
    if (!_isValidGameId(gameId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid game id');
    }

    const game = await gameRepository.findById(gameId);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
    }

    if (TERMINAL_GAME_STATUSES.includes(game.status)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Chat is closed for this game');
    }

    if (!_isUserInGame(game, userId)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only players in this game can chat');
    }

    if (!_checkRateLimit(userId.toString(), gameId)) {
      throw new ApiError(
        429,
        `Too many messages. Maximum ${CHAT_LIMITS.RATE_LIMIT_MAX_MESSAGES} messages per ${CHAT_LIMITS.RATE_LIMIT_WINDOW_MS / 1000} seconds.`
      );
    }

    const { displayMessage, messageType } = this.prepareMessageContent(message);
    const playerName = input.playerName || _playerNameForUser(game, userId);

    const saved = await chatRepository.create({
      gameId,
      senderId: userId,
      playerName,
      message: displayMessage,
      messageType,
      isBot: false,
    });

    const payload = this._toSocketPayload(saved);
    io.to(`game:${gameId}`).emit('chat_received', payload);
    logger.info(`Chat saved & broadcast game=${gameId} user=${userId}`);
    return payload;
  }

  /**
   * Bot / system path: persist and broadcast once.
   * @param {import('socket.io').Server} io
   * @param {Object} payload
   */
  async persistAndBroadcastBotMessage(io, payload) {
    const { gameId, playerId, playerName, message, messageType, isBot, timestamp } = payload;
    const gid = gameId?.toString?.() ?? gameId;
    if (!gid || !_isValidGameId(gid)) {
      logger.warn('persistAndBroadcastBotMessage: invalid gameId');
      return;
    }

    const game = await gameRepository.findById(gid);
    if (!game) return;

    let displayMessage = message;
    let mt = messageType || CHAT_TYPE.QUICK_MESSAGE;
    try {
      const prep = this.prepareMessageContent(message);
      displayMessage = prep.displayMessage;
      mt = prep.messageType;
    } catch {
      displayMessage = String(message).slice(0, CHAT_LIMITS.MAX_MESSAGE_LENGTH);
    }

    const saved = await chatRepository.create({
      gameId: gid,
      senderId: playerId,
      playerName: playerName || 'Bot',
      message: displayMessage,
      messageType: mt,
      isBot: !!isBot,
    });

    const out = this._toSocketPayload(saved, timestamp);
    io.to(`game:${gid}`).emit('chat_received', out);
  }

  /**
   * @param {string} gameId
   * @param {string} userId
   * @param {{ page?: number, limit?: number }} pagination
   */
  async getHistoryForUser(gameId, userId, pagination = {}) {
    if (!_isValidGameId(gameId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid game id');
    }

    const game = await gameRepository.findById(gameId);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
    }

    if (!_isUserInGame(game, userId)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only players in this game can view chat history');
    }

    return chatRepository.findByGameId(gameId, pagination);
  }

  _toSocketPayload(doc, timestampOverride) {
    const ts = timestampOverride || doc.createdAt || new Date();
    return {
      gameId: doc.gameId.toString(),
      playerId: doc.senderId.toString(),
      playerName: doc.playerName,
      message: doc.message,
      messageType: doc.messageType,
      isBot: doc.isBot,
      timestamp: ts instanceof Date ? ts : new Date(ts),
    };
  }

  /**
   * @param {string} gameId
   * @param {string} userId
   * @param {string} [playerName]
   */
  async assertCanUseTyping(gameId, userId, playerName) {
    if (!_isValidGameId(gameId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid game id');
    }
    const game = await gameRepository.findById(gameId);
    if (!game) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
    }
    if (TERMINAL_GAME_STATUSES.includes(game.status)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Chat is closed for this game');
    }
    if (!_isUserInGame(game, userId)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only players in this game can signal typing');
    }
    return { game, playerName: playerName || _playerNameForUser(game, userId) };
  }

  clearRateLimitsForTests() {
    userGameRateLimitMap.clear();
  }
}

module.exports = new ChatService();
