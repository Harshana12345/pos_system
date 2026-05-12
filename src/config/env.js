try {
  require('dotenv').config();
} catch {
  // dotenv is optional for environments that inject process.env directly.
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'pos_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    maxPoolSize: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'development-access-token-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-token-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  passwordReset: {
    expiresInMinutes: Number(process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES || 60),
    resetUrl: process.env.PASSWORD_RESET_URL || 'http://localhost:5173/reset-password',
  },
  inventory: {
    expiringThresholdDays: Number(process.env.INVENTORY_EXPIRING_THRESHOLD_DAYS || 30),
  },
  loyalty: {
    pointsEnabled: process.env.LOYALTY_POINTS_ENABLED !== 'false',
    spendAmountPerPoint: Number(process.env.LOYALTY_SPEND_AMOUNT_PER_POINT || 100),
    rounding: process.env.LOYALTY_POINTS_ROUNDING || 'floor',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'POS System <no-reply@pos-system.local>',
  },
  sms: {
    webhookUrl: process.env.SMS_WEBHOOK_URL,
    apiKey: process.env.SMS_API_KEY,
    from: process.env.SMS_FROM || 'POS System',
  },
};

module.exports = { env };
