const { EventEmitter } = require('events');

const gameEvents = new EventEmitter();
gameEvents.setMaxListeners(0);

module.exports = gameEvents;
