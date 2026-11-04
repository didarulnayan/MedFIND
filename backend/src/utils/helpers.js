const env = require('../config/env');

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- JSON responses ----------
function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

// ---------- Time (all business times use the configured timezone, Asia/Dhaka = +06:00) ----------
function offsetMinutes() {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(env.timezoneOffset);
  if (!m) return 360;
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/** Combine a local date (YYYY-MM-DD) and time (HH:mm) into a Date. */
function localDateTime(date, time) {
  const d = new Date(`${date}T${time}:00${env.timezoneOffset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Day of week (0 = Sunday), HH:mm and YYYY-MM-DD of a Date in local time. */
function localParts(date = new Date()) {
  const shifted = new Date(date.getTime() + offsetMinutes() * 60000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return { day: shifted.getUTCDay(), time: `${hh}:${mm}`, dateKey: shifted.toISOString().slice(0, 10) };
}

function startOfLocalDay(date = new Date()) {
  return new Date(`${localParts(date).dateKey}T00:00:00${env.timezoneOffset}`);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysUntil(date, from = new Date()) {
  return Math.ceil((new Date(date).getTime() - from.getTime()) / DAY_MS);
}

/** Human readable "time left" used by the batch table (e.g. "48 days", "3 months", "1 year"). */
function timeLeftLabel(expiryDate, from = new Date()) {
  if (!expiryDate) return 'No expiry';
  const days = daysUntil(expiryDate, from);
  if (days <= 0) return 'Expired';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'}`;
}

// ---------- Opening hours ----------
/** openingHours: [{ day: 0-6 (Sun-Sat), open: 'HH:mm', close: 'HH:mm' }]; overnight slots supported. */
function isOpenAt(openingHours, date = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return false;
  const { day, time } = localParts(date);
  const prevDay = (day + 6) % 7;
  return openingHours.some((slot) => {
    if (slot.close > slot.open) return slot.day === day && time >= slot.open && time < slot.close;
    return (slot.day === day && time >= slot.open) || (slot.day === prevDay && time < slot.close);
  });
}

// ---------- Pagination / search ----------
function getPagination(query, { limit = 10, max = 50 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(query.limit, 10) || limit, 1), max);
  return { page, limit: size, skip: (page - 1) * size };
}

function pageMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

function escapeRegex(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  DAY_MS, ok, created, localDateTime, localParts, startOfLocalDay, addDays, daysUntil, timeLeftLabel,
  isOpenAt, getPagination, pageMeta, escapeRegex,
};
