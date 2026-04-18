const winston = require('winston');
const path = require('path');
const fs = require('fs');

const isProd = process.env.NODE_ENV === 'production';

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: isProd ? prodFormat : devFormat,
  }),
];

if (isProd) {
  const logsDir = path.join(process.cwd(), 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: prodFormat,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: prodFormat,
      })
    );
  } catch {
    // If we can't create log files, console-only is fine
  }
}

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  transports,
});

module.exports = logger;
