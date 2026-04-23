// Structured logging helper — wraps the existing winston logger with an HTTP request middleware.
// Use httpLogger in server.js: app.use(httpLogger) right after helmet/cors.
// Logs request method, path, status, duration in JSON (production) or colored text (dev).

const logger = require('../services/logger');

function httpLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };
    // Log level by status: 5xx → error, 4xx → warn, else info
    if (res.statusCode >= 500) logger.error('http', entry);
    else if (res.statusCode >= 400) logger.warn('http', entry);
    else logger.info('http', entry);
  });
  next();
}

module.exports = { logger, httpLogger };
