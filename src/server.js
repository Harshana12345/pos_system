require('dotenv').config();

const app = require('./app');
const { env } = require('./config/env');

const server = app.listen(env.port, () => {
  console.log(`POS System API listening on port ${env.port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Closing HTTP server.`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

