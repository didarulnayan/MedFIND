const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable ${key}. Copy .env.example to .env and fill it in.`);
  }
}

const int = (key, fallback) => {
  const value = parseInt(process.env[key], 10);
  return Number.isNaN(value) ? fallback : value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: int('BCRYPT_SALT_ROUNDS', 10),
  ports: {
    all: int('PORT_ALL', 5000),
    member1: int('PORT_MEMBER1', 9421),
    member2: int('PORT_MEMBER2', 9050),
    member3: int('PORT_MEMBER3', 1783),
    member4: int('PORT_MEMBER4', 1274),
  },
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no-reply@medfind.example',
  },
  timezoneOffset: process.env.TIMEZONE_OFFSET || '+06:00',
  reservation: {
    graceMinutes: int('RESERVATION_PICKUP_GRACE_MINUTES', 120),
    minLeadMinutes: int('RESERVATION_MIN_LEAD_MINUTES', 30),
    maxDaysAhead: int('RESERVATION_MAX_DAYS_AHEAD', 7),
  },
  suspension: {
    minValidComplaints: int('SUSPENSION_MIN_VALID_COMPLAINTS', 3),
    windowDays: int('SUSPENSION_WINDOW_DAYS', 30),
  },
  cronEnabled: process.env.CRON_ENABLED !== 'false',
};
