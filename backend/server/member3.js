/** Member 3 server: npm run start:member3 */
require('../src/server').startMemberServer(3).catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
