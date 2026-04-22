require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Startup diagnostics — visible in Railway/Docker logs before any validation crash
console.log('[Config] NODE_ENV:', nodeEnv);
console.log('[Config] PORT:', process.env.PORT || '(not set, default 4000)');
console.log('[Config] JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : '*** NOT SET ***');
console.log('[Config] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : '*** NOT SET ***');
console.log('[Config] ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || '(not set)');

const WEAK_JWT_DEFAULTS = ['ccb-mart-change-this-secret', 'dev-only-change-in-prod', 'secret'];

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
} else if (isProduction && WEAK_JWT_DEFAULTS.includes(process.env.JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET must not use a default/weak value in production');
  process.exit(1);
}

if (isProduction) {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required in production');
    process.exit(1);
  }
  if (!process.env.ALLOWED_ORIGINS) {
    console.error('FATAL: ALLOWED_ORIGINS is required in production');
    process.exit(1);
  }
}

const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '4000'),
  db: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
  },
  redis: {
    host: process.env.REDIS_HOST || null,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || null,
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'ap-southeast-1',
    },
  },
  payment: {
    momo: {
      partnerCode: process.env.MOMO_PARTNER_CODE || '',
      accessKey: process.env.MOMO_ACCESS_KEY || '',
      secretKey: process.env.MOMO_SECRET_KEY || '',
    },
    zalopay: {
      appId: process.env.ZALOPAY_APP_ID || '',
      key1: process.env.ZALOPAY_KEY1 || '',
      key2: process.env.ZALOPAY_KEY2 || '',
    },
  },
  kiotviet: {
    clientId: process.env.KIOTVIET_CLIENT_ID || '',
    clientSecret: process.env.KIOTVIET_CLIENT_SECRET || '',
    retailer: process.env.KIOTVIET_RETAILER || '',
    webhookSecret: process.env.KIOTVIET_WEBHOOK_SECRET || '',
  },
};

module.exports = config;
