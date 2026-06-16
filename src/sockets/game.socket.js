/**
 * Game Socket Events Handler
 */
const gameEvents = require('../utils/gameEvents');
const {
  SOCKET_EVENTS_SERVER_TO_CLIENT: SERVER_EVENTS,
  SOCKET_ERRORS,
} = require('../constants/socket.constants');

const getGameRoom = (gameId) => (gameId ? `game:${gameId}` : null);
let bridgeRegistered = false;
let bridgeIo = null;

const emitRoomEvent = (io, room, eventName, payload) => {
  if (!room) {
    return false;
  }

  io.to(room).emit(eventName, payload);
  return true;
};

const registerBridge = (io) => {
  bridgeIo = io;

  if (bridgeRegistered) {
    return;
  }

  bridgeRegistered = true;

  const broadcast = (eventName, payload) => {
    const room = getGameRoom(payload && payload.gameId);
    if (!room || !bridgeIo) {
      return;
    }

    bridgeIo.to(room).emit(eventName, payload);
  };

  [
    SERVER_EVENTS.GAME_JOINED,
    SERVER_EVENTS.DICE_ROLLED,
    SERVER_EVENTS.TOKEN_MOVED,
    SERVER_EVENTS.TURN_CHANGED,
    SERVER_EVENTS.GAME_ENDED,
    SERVER_EVENTS.PLAYER_DISCONNECTED,
    SERVER_EVENTS.PLAYER_RECONNECTED,
    SERVER_EVENTS.GAME_STATE_SYNC,
  ].forEach((eventName) => {
    gameEvents.on(eventName, (payload) => broadcast(eventName, payload));
  });
};

const gameSocket = (socket, io) => {
  registerBridge(io);

  socket.on('join_game', async (data) => {
    const room = getGameRoom(data && data.gameId);

    if (!room) {
      socket.emit(SERVER_EVENTS.ERROR_EVENT, {
        message: SOCKET_ERRORS.INVALID_GAME_ID,
      });
      return;
    }

    socket.join(room);

    try {
      const gameService = require('../services/gameService');

      // Mark player as active on socket join
      if (socket.userId && data && data.gameId) {
        try {
          await gameService.markPlayerActive(data.gameId, socket.userId);
        } catch (err) {
          console.error('Error marking player active on socket join:', err);
        }
      }

      const formattedGame = await gameService.restoreGameState(data.gameId);
      
      if (socket.userId && formattedGame.players) {
        const isParticipant = formattedGame.players.some(
          (p) => String(p.userId) === String(socket.userId)
        );
        if (!isParticipant) {
          socket.leave(room);
          socket.emit(SERVER_EVENTS.ERROR_EVENT, {
            message: 'Access Denied: You are not a participant in this game',
          });
          return;
        }
      }

      socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId: data.gameId,
        game: formattedGame,
        status: formattedGame.status,
        currentTurn: formattedGame.currentTurn,
        turnVersion: formattedGame.turnVersion,
      });
    } catch (err) {
      socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        ...data,
        room,
        status: 'subscribed',
      });
    }
  });

  socket.on('roll_dice', (data) => {
    socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, data);
  });

  socket.on('move_token', (data) => {
    socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, data);
  });

  socket.on('skip_turn', (data) => {
    socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, data);
  });

  socket.on('leave_game', (data) => {
    const room = getGameRoom(data && data.gameId);

    if (!room) {
      return;
    }

    emitRoomEvent(io, room, SERVER_EVENTS.PLAYER_DISCONNECTED, data);
    socket.leave(room);
  });

  socket.on('reconnect_game', async (data) => {
    const room = getGameRoom(data && data.gameId);

    if (!room) {
      socket.emit(SERVER_EVENTS.ERROR_EVENT, {
        message: SOCKET_ERRORS.INVALID_GAME_ID,
      });
      return;
    }

    socket.join(room);
    try {
      const gameService = require('../services/gameService');

      // Mark player as active on socket reconnect
      if (socket.userId && data && data.gameId) {
        try {
          await gameService.markPlayerActive(data.gameId, socket.userId);
        } catch (err) {
          console.error('Error marking player active on socket reconnect:', err);
        }
      }

      const formattedGame = await gameService.restoreGameState(data.gameId);
      socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId: data.gameId,
        game: formattedGame,
        status: formattedGame.status,
        currentTurn: formattedGame.currentTurn,
        turnVersion: formattedGame.turnVersion,
      });
    } catch (err) {
      socket.emit(SERVER_EVENTS.GAME_STATE_SYNC, data);
    }
  });
};

module.exports = gameSocket;
