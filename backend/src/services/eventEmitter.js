const EventEmitter = require('events');

const appEvents = new EventEmitter();
appEvents.setMaxListeners(0); // Unlimited — one listener per SSE connection, no artificial cap

module.exports = appEvents;
