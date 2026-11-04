/** Member 1 server: npm run start:member1 */
require('../src/server').startMemberServer(1).catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
