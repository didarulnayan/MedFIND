const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const { startJobs } = require('./jobs');

/** Connects to MongoDB, starts the selected cron jobs and listens on the given port. */
async function startServer({ label, port, features, jobs }) {
  await connectDB();
  const app = createApp({ label, features });
  const tasks = startJobs(jobs);

  const server = app.listen(port, () => {
    console.log(`[server] ${label} listening on http://127.0.0.1:${port}`);
    console.log(`[server] features: ${features.join(', ')}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`[server] port ${port} is already in use`);
    else console.error(err);
    process.exit(1);
  });

  const shutdown = async () => {
    tasks.forEach((t) => t.stop());
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}

/** Starts the server of one member (1-4) on the port derived from their student ID. */
function startMemberServer(memberNo) {
  const { MEMBERS } = require('./routes/features');
  const m = MEMBERS[memberNo];
  return startServer({
    label: `MedFind BD - Member ${memberNo} (${m.name}, ${m.studentId})`,
    port: env.ports[m.portKey],
    features: m.features,
    jobs: m.jobs,
  });
}

module.exports = { startServer, startMemberServer };
