/** Member 4 server: npm run start:member4 */
require('../src/server').startMemberServer(4).catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
