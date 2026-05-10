const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.port, () => {
  console.log(`POS API listening on port ${env.port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
