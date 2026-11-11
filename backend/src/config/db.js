const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

/** Connects to MongoDB, retrying a few times: Atlas occasionally rejects a TLS handshake (transient). */
async function connectDB(uri = env.mongoUri, { attempts = 4 } = {}) {
  for (let i = 1; ; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      const { host, name } = mongoose.connection;
      console.log(`[db] connected to MongoDB ${host}/${name}`);
      return mongoose.connection;
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = i * 2000;
      console.warn(`[db] connection attempt ${i} failed (${err.message.split('\n')[0]}); retrying in ${wait / 1000}s`);
      await mongoose.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
