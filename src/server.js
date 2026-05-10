require('dotenv').config();

const app = require('./app');
const { env } = require('./config/env');
const { closeDatabase, connectDatabase } = require('./config/database');

const server = app.listen(env.port, () => {
  console.log(`POS System API listening on port ${env.port}`);
});

connectDatabase()
  .then(({ message }) => {
    console.log(message);
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
  });

const shutdown = (signal) => {
  console.log(`${signal} received. Closing HTTP server.`);
  server.close(async () => {
    try {
      await closeDatabase();
    } catch (error) {
      console.error('Error closing database pool:', error.message);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
