/** Member 2 server: npm run start:member2 */
require('../src/server').startMemberServer(2).catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
