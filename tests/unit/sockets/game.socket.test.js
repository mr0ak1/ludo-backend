const gameEvents = require('../../../src/utils/gameEvents');
const gameSocket = require('../../../src/sockets/game.socket');

describe('game.socket', () => {
  beforeEach(() => {
    gameEvents.removeAllListeners();
    jest.clearAllMocks();
  });

  it('registers gameplay handlers and broadcasts service events to the room', () => {
    const handlers = {};
    const room = { emit: jest.fn() };
    const io = {
      to: jest.fn(() => room),
    };
    const socket = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };

    gameSocket(socket, io);

    handlers.join_game({ gameId: 'game123', userId: 'user123' });
    expect(socket.join).toHaveBeenCalledWith('game:game123');
    expect(socket.emit).toHaveBeenCalledWith('game_state_sync', {
      gameId: 'game123',
      userId: 'user123',
      room: 'game:game123',
      status: 'subscribed',
    });

    gameEvents.emit('game_joined', {
      gameId: 'game123',
      userId: 'user123',
      game: { _id: 'game123' },
    });
    expect(io.to).toHaveBeenCalledWith('game:game123');
    expect(room.emit).toHaveBeenCalledWith('game_joined', {
      gameId: 'game123',
      userId: 'user123',
      game: { _id: 'game123' },
    });

    room.emit.mockClear();
    io.to.mockClear();

    gameEvents.emit('dice_rolled', {
      gameId: 'game123',
      diceValue: 6,
    });
    expect(room.emit).toHaveBeenCalledWith('dice_rolled', {
      gameId: 'game123',
      diceValue: 6,
    });

    room.emit.mockClear();
    io.to.mockClear();

    gameEvents.emit('turn_changed', {
      gameId: 'game123',
      currentTurn: 1,
    });
    expect(room.emit).toHaveBeenCalledWith('turn_changed', {
      gameId: 'game123',
      currentTurn: 1,
    });

    room.emit.mockClear();
    io.to.mockClear();

    handlers.leave_game({ gameId: 'game123' });
    expect(room.emit).toHaveBeenCalledWith('player_disconnected', { gameId: 'game123' });
    expect(socket.leave).toHaveBeenCalledWith('game:game123');

    room.emit.mockClear();
    io.to.mockClear();

    handlers.reconnect_game({ gameId: 'game123' });
    expect(socket.join).toHaveBeenCalledWith('game:game123');
    expect(socket.emit).toHaveBeenCalledWith('game_state_sync', { gameId: 'game123' });
  });

  it('emits an error event when join_game has no game id', () => {
    const handlers = {};
    const socket = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };
    const io = {
      to: jest.fn(),
    };

    gameSocket(socket, io);

    handlers.join_game({});

    expect(socket.emit).toHaveBeenCalledWith('error_event', {
      message: 'Invalid game ID',
    });
    expect(socket.join).not.toHaveBeenCalled();
  });
});
