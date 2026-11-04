const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth.routes');
const { FEATURES } = require('./routes/features');
const { notFound, errorHandler } = require('./middleware/error');
const { storageMode } = require('./services/storage.service');
const { emailMode } = require('./services/notification.service');

/**
 * Builds an Express app that mounts the common routes plus the requested feature routers.
 * @param {{ label: string, features: string[] }} options
 */
function createApp({ label = 'MedFind BD API', features = Object.keys(FEATURES) } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: `${label} is running`,
      data: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        databaseName: mongoose.connection.name,
        features: features.map((key) => ({ key, member: FEATURES[key].member, title: FEATURES[key].title })),
        storage: storageMode,
        email: emailMode,
        time: new Date().toISOString(),
      },
    });
  });

  app.use('/api', authRoutes);
  for (const key of features) {
    if (!FEATURES[key]) throw new Error(`Unknown feature: ${key}`);
    app.use('/api', FEATURES[key].router());
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
