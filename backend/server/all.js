/** All features on one port (PORT_ALL, default 5000): npm start */
const env = require('../src/config/env');
const { startServer } = require('../src/server');
const { FEATURES } = require('../src/routes/features');

startServer({
  label: 'MedFind BD - All features',
  port: env.ports.all,
  features: Object.keys(FEATURES),
  jobs: ['reservationExpiry', 'stockRefresh'],
}).catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
