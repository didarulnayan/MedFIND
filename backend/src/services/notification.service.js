const sgMail = require('@sendgrid/mail');
const env = require('../config/env');
const { Notification, User } = require('../models');

const emailEnabled = Boolean(env.sendgrid.apiKey);
if (emailEnabled) sgMail.setApiKey(env.sendgrid.apiKey);

async function sendEmail(to, subject, text) {
  if (!emailEnabled) {
    console.log(`[email:mock] to=${to} subject="${subject}"`);
    return { mocked: true };
  }
  await sgMail.send({ to, from: env.sendgrid.from, subject, text });
  return { mocked: false };
}

/**
 * Creates an in-app notification and sends an email. Never throws: a failed
 * notification must not fail the business action that triggered it.
 */
async function notify(userId, { type, title, message, data }, { email = true } = {}) {
  try {
    await Notification.create({ user: userId, type, title, message, data });
    if (email) {
      const user = await User.findById(userId).select('email');
      if (user) await sendEmail(user.email, `MedFind BD: ${title}`, message);
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

async function listForUser(userId, { unreadOnly = false } = {}) {
  const filter = { user: userId, ...(unreadOnly ? { read: false } : {}) };
  return Notification.find(filter).sort({ createdAt: -1 }).limit(50);
}

module.exports = { notify, sendEmail, listForUser, emailMode: emailEnabled ? 'sendgrid' : 'console' };
