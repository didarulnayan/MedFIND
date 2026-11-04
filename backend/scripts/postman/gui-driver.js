/**
 * Sends every documented request through the Postman desktop app (pasted as cURL), screenshots the Postman window
 * and records the status code the server actually logged for that request.
 *   node scripts/postman/gui-driver.js <member> [logFile] [onlyIds...]
 * The database should be freshly seeded before a member's run.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const mongoose = require('mongoose');
const env = require('../../src/config/env');
const M = require('../../src/models');
const { MEMBERS, LOGINS, ordered, SEED } = require('./spec');

const ROOT = path.resolve(__dirname, '../../..');
const PS = path.join(ROOT, 'tools-local', 'postman-request.ps1');
const ASSETS = path.join(ROOT, 'postman');
const TMP = path.join(ROOT, 'tools-local', 'curl.txt');

const member = Number(process.argv[2]);
const logFile = process.argv[3];
const only = process.argv.slice(4);
const base = `http://127.0.0.1:${MEMBERS[member].port}`;
const shotDir = path.join(ROOT, 'screenshots', `Member${member}`);
fs.mkdirSync(shotDir, { recursive: true });

const userId = async (email) => (await M.User.findOne({ email }))._id;
const LOOKUPS = {
  catalogItemId: async () => M.CatalogItem.findOne({ pharmacy: SEED.lazzId, medicine: SEED.ostocalId }),
  batchId: async () => M.InventoryBatch.findOne({ catalogItem: SEED.lazzNapaItemId, batchNumber: 'NP-2501' }),
  reservationId: async () => M.Reservation.findOne({ patient: await userId('imran@medfind.test'), pharmacy: SEED.lazzId, 'medicineSnapshot.brandName': 'Napa' }).sort({ createdAt: -1 }),
  rejectReservationId: async () => M.Reservation.findOne({ pharmacy: SEED.lazzId, status: 'Pending', 'medicineSnapshot.brandName': 'Seclo 20' }),
  cancelReservationId: async () => M.Reservation.findOne({ pharmacy: SEED.lazzId, status: 'Pending', patient: await userId('ayesha@medfind.test'), 'medicineSnapshot.brandName': 'Napa' }),
  newPharmacyId: async () => M.Pharmacy.findOne({ name: 'Nadia Drug House' }),
  reviewReservationId: async () => M.Reservation.findOne({ patient: await userId('ayesha@medfind.test'), pharmacy: SEED.lazzId, status: 'Collected', reviewed: false }),
  complaintId: async () => M.Complaint.findOne({ patient: await userId('ayesha@medfind.test'), targetType: 'reservation' }).sort({ createdAt: -1 }),
};

const vars = { ...SEED, pickupDate: new Date(Date.now() + 30 * 3600 * 1000).toISOString().slice(0, 10) };

async function resolve(text) {
  let out = text;
  for (const [, name] of text.matchAll(/\{\{(\w+)\}\}/g)) {
    if (vars[name] === undefined) {
      if (LOGINS[name]) {
        const [email, password] = LOGINS[name];
        const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        vars[name] = (await res.json()).data.token;
      } else if (LOOKUPS[name]) {
        const doc = await LOOKUPS[name]();
        if (!doc) throw new Error(`lookup failed for ${name}`);
        vars[name] = String(doc._id);
      } else throw new Error(`unknown variable ${name}`);
    }
    out = out.split(`{{${name}}}`).join(vars[name]);
  }
  return out;
}

const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

async function toCurl(r) {
  const qs = r.query ? `?${Object.entries(r.query).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ',')}`).join('&')}` : '';
  const parts = [`curl --location --request ${r.method} ${q(await resolve(`${base}${r.path}${qs}`))}`];
  if (r.auth) parts.push(`--header ${q(`Authorization: Bearer ${await resolve(`{{${r.auth}}}`)}`)}`);
  if (r.body) {
    parts.push(`--header 'Content-Type: application/json'`);
    parts.push(`--data-raw ${q(await resolve(JSON.stringify(r.body, null, 2)))}`);
  }
  for (const f of r.form || []) {
    if (f.file) parts.push(`--form ${q(`${f.key}=@"${path.join(ASSETS, f.file).replace(/\\/g, '/')}"`)}`);
    else parts.push(`--form ${q(`${f.key}=${await resolve(f.value)}`)}`);
  }
  return parts.join(' \\\n');
}

function lastLoggedStatus(method, urlPath) {
  if (!logFile || !fs.existsSync(logFile)) return null;
  const lines = fs.readFileSync(logFile, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).reverse();
  const hit = lines.find((l) => l.startsWith(`${method} ${urlPath}`));
  const m = hit && hit.match(/ (\d{3}) [\d.]+ ms/);
  return m ? Number(m[1]) : null;
}

(async () => {
  await mongoose.connect(env.mongoUri);
  const manifestPath = path.join(shotDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  for (const r of ordered(member)) {
    if (only.length && !only.includes(r.id)) continue;
    const curl = await toCurl(r);
    fs.writeFileSync(TMP, curl);
    const tab = r.body || r.form ? 'body' : r.query ? 'params' : 'headers';
    const out = path.join(shotDir, `${r.id}.png`);
    const before = Date.now();
    const file = (r.form || []).find((f) => f.file);
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, '-CurlFile', TMP, '-Out', out, '-Tab', tab];
    if (file) {
      // Postman lists file rows after the text rows; rows are 41 px apart starting at y = 434
      const fileRow = r.form.filter((f) => !f.file).length;
      if (fileRow > 5) throw new Error(`${r.id}: file row ${fileRow} is outside the visible form area`);
      args.push('-FilePath', path.join(ASSETS, file.file), '-FileY', String(434 + fileRow * 41));
    }
    const res = execFileSync('powershell', args, { encoding: 'utf8' });
    if (!res.includes('OK')) throw new Error(`Postman step failed for ${r.id}: ${res}`);
    const resolvedPath = new URL(await resolve(`${base}${r.path}`)).pathname;
    const status = lastLoggedStatus(r.method, resolvedPath);
    manifest[r.id] = { expected: r.expect, serverLogged: status, ok: status === r.expect, screenshot: path.relative(ROOT, out).replace(/\\/g, '/'), url: resolvedPath, at: new Date(before).toISOString() };
    console.log(`${r.id} expected ${r.expect} logged ${status} ${status === r.expect ? 'OK' : 'MISMATCH'}`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  fs.rmSync(TMP, { force: true });
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  fs.rmSync(TMP, { force: true });
  await mongoose.disconnect();
  process.exit(1);
});
