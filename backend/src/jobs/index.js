const cron = require('node-cron');
const env = require('../config/env');
const { expireOverdueReservations } = require('../services/reservationStatus.service');
const { refreshAllStock } = require('../services/inventory.service');
const { generateAlerts } = require('../services/alert.service');

/**
 * node-cron jobs. Each member server starts only the jobs related to its features.
 * The jobs are idempotent, so running the same job in two processes is harmless.
 */
const JOBS = {
  // Member 2: expire Pending/Confirmed/Ready reservations whose pickup deadline has passed (every 5 minutes)
  reservationExpiry: () =>
    cron.schedule('*/5 * * * *', async () => {
      const { expiredCount } = await expireOverdueReservations();
      if (expiredCount) console.log(`[cron] expired ${expiredCount} overdue reservation(s)`);
    }),
  // Member 1: recount non-expired stock and raise low-stock / expiry alerts (every hour at minute 5)
  stockRefresh: () =>
    cron.schedule('5 * * * *', async () => {
      const items = await refreshAllStock();
      const alerts = await generateAlerts();
      console.log(`[cron] refreshed stock for ${items} item(s); ${alerts.created} new alert(s)`);
    }, { timezone: 'Asia/Dhaka' }),
};

function startJobs(names = Object.keys(JOBS)) {
  if (!env.cronEnabled) return [];
  return names.map((name) => {
    const task = JOBS[name]();
    console.log(`[cron] scheduled job: ${name}`);
    return task;
  });
}

module.exports = { startJobs, JOBS };
