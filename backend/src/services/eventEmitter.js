const EventEmitter = require('events');

const appEvents = new EventEmitter();
appEvents.setMaxListeners(200); // Support many concurrent SSE connections

module.exports = appEvents;
