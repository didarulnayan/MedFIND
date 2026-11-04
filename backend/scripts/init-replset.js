/**
 * LOCAL DEVELOPMENT ONLY. MongoDB transactions need a replica set.
 * MongoDB Atlas clusters are already replica sets, so this script is not needed with Atlas.
 * Start mongod with --replSet rs0, then run: npm run db:init-replset
 */
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true');
  await client.connect();
  const admin = client.db('admin');
  try {
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log(`Replica set already initialised: ${status.set}`);
  } catch (err) {
    if (!/no replset config|NotYetInitialized/i.test(err.message + err.codeName)) throw err;
    await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] } });
    console.log('Replica set rs0 initiated');
  }
  await client.close();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
