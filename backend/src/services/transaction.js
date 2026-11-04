const mongoose = require('mongoose');

/**
 * Runs fn(session) inside a MongoDB transaction (MongoDB Atlas and replica sets support this).
 * All writes that must succeed or fail together (e.g. "mark Collected" + "reduce stock") go through here.
 */
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };
