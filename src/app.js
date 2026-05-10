const express = require('express');
const path = require('node:path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { env } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const routes = require('./routes');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

if (env.apiPrefix !== '/api') {
  app.use('/api/auth', authRoutes);
}

app.use(env.apiPrefix, routes);

app.get('/', (_req, res) => {
  res.json({
    name: 'POS System API',
    status: 'ok',
    apiPrefix: env.apiPrefix,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
