// Display helpers. All dates are shown in Bangladesh time (Asia/Dhaka).
const TZ = 'Asia/Dhaka';

export function taka(n, digits = 2) {
  if (n === undefined || n === null) return '-';
  return `Tk ${Number(n).toFixed(digits)}`;
}

export function priceRange(range, unit = 'pc') {
  if (!range) return 'Not listed yet';
  const digits = range.max >= 20 ? 0 : 2;
  const min = Number(range.min).toFixed(digits);
  const max = Number(range.max).toFixed(digits);
  return `Tk ${min === max ? min : `${min} - ${max}`} / ${unit}`;
}

export function timeAgo(date) {
  if (!date) return '-';
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  const w = Math.round(d / 7);
  if (d < 30) return `${w} week${w === 1 ? '' : 's'} ago`;
  return dateOnly(date);
}

export function dateOnly(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
}

export function dateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
}

export function fullDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
}

/** Today + n days as YYYY-MM-DD in Dhaka time (for date inputs). */
export function localDate(addDays = 0) {
  const d = new Date(Date.now() + addDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function shortName(name = '') {
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}
