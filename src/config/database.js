const { Pool } = require('pg');

const { env } = require('./env');

const poolConfig = env.database.url
  ? {
      connectionString: env.database.url,
      max: env.database.maxPoolSize,
      idleTimeoutMillis: env.database.idleTimeoutMillis,
      connectionTimeoutMillis: env.database.connectionTimeoutMillis,
    }
  : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      max: env.database.maxPoolSize,
      idleTimeoutMillis: env.database.idleTimeoutMillis,
      connectionTimeoutMillis: env.database.connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

async function connectDatabase() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');

    return {
      connected: true,
      message: 'Database connection established.',
    };
  } finally {
    client.release();
  }
}

function query(text, params) {
  return pool.query(text, params);
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { closeDatabase, connectDatabase, pool, query };
