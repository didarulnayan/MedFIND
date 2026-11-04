/**
 * Generates Postman v2.1 collections + environments from spec.js.
 *   node scripts/postman/build-collections.js
 * Output: ../postman/Member1..4, ../postman/Master_Collection, ../postman/environments
 */
const fs = require('fs');
const path = require('path');
const { MEMBERS, LOGINS, MEMBER_LOGINS, ordered, SEED } = require('./spec');

const OUT = path.resolve(__dirname, '../../../postman');
const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const PICKUP_SCRIPT = [
  '// Preferred pickup date = tomorrow in Asia/Dhaka (UTC+6), used by reservation requests',
  'const dhaka = new Date(Date.now() + 6 * 3600 * 1000 + 24 * 3600 * 1000);',
  "pm.collectionVariables.set('pickupDate', dhaka.toISOString().slice(0, 10));",
];

function urlObject(raw) {
  const [base, qs] = raw.split('?');
  const pathPart = base.replace('{{baseUrl}}', '');
  return {
    raw,
    host: ['{{baseUrl}}'],
    path: pathPart.split('/').filter(Boolean),
    ...(qs ? { query: qs.split('&').map((kv) => { const [key, ...v] = kv.split('='); return { key, value: decodeURIComponent(v.join('=')) }; }) } : {}),
  };
}

function rawUrl(r) {
  const qs = r.query ? `?${Object.entries(r.query).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ',').replace(/%20/g, '%20')}`).join('&')}` : '';
  return `{{baseUrl}}${r.path}${qs}`;
}

function testScript(r) {
  const lines = [
    `pm.test('Status code is ${r.expect}', () => pm.response.to.have.status(${r.expect}));`,
    `pm.test('Response has success flag', () => pm.expect(pm.response.json()).to.have.property('success', ${r.expect < 400}));`,
  ];
  if (r.capture) {
    const expr = r.capture.path.split('.').map((p) => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`)).join('');
    lines.push(`const json = pm.response.json();`, `if (pm.response.code < 300) pm.collectionVariables.set('${r.capture.var}', json${expr});`);
  }
  for (const c of r.captureMany || []) {
    lines.push(
      `{ const item = pm.response.json().data.reservations.find((x) => x.medicine.includes('${c.find}')${c.patient ? ` && x.patient.name === '${c.patient}'` : ''});`,
      `  if (item) pm.collectionVariables.set('${c.var}', item.id); }`
    );
  }
  return lines;
}

function toItem(r) {
  const header = [];
  if (r.auth) header.push({ key: 'Authorization', value: `Bearer {{${r.auth}}}` });
  let body;
  if (r.body) {
    header.push({ key: 'Content-Type', value: 'application/json' });
    body = { mode: 'raw', raw: JSON.stringify(r.body, null, 2), options: { raw: { language: 'json' } } };
  } else if (r.form) {
    body = {
      mode: 'formdata',
      formdata: r.form.map((f) => (f.file ? { key: f.key, type: 'file', src: f.file } : { key: f.key, value: f.value, type: 'text' })),
    };
  }
  return {
    name: `${r.id} ${r.name}`,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: testScript(r) } }],
    request: {
      method: r.method,
      header,
      ...(body ? { body } : {}),
      url: urlObject(rawUrl(r)),
      description: `${r.purpose}\n\nExpected status: ${r.expect}${r.auth ? `\nAuth: Bearer token of ${r.auth}` : '\nAuth: none (public)'}`,
    },
  };
}

function loginItem(varName) {
  const [email, password] = LOGINS[varName];
  return {
    name: `Login -> ${varName} (${email})`,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
      "pm.test('Logged in', () => pm.response.to.have.status(200));",
      `pm.collectionVariables.set('${varName}', pm.response.json().data.token);`,
    ] } }],
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: { mode: 'raw', raw: JSON.stringify({ email, password }, null, 2), options: { raw: { language: 'json' } } },
      url: urlObject('{{baseUrl}}/api/auth/login'),
      description: 'Common login (shared by all members, not an assessed feature). Stores the JWT in a collection variable. Development-only demo account.',
    },
  };
}

function variables(member) {
  const vars = [{ key: 'baseUrl', value: `http://127.0.0.1:${MEMBERS[member].port}` }, { key: 'pickupDate', value: '' }];
  for (const [k, v] of Object.entries(SEED)) vars.push({ key: k, value: v });
  for (const t of MEMBER_LOGINS[member]) vars.push({ key: t, value: '' });
  return vars;
}

function memberCollection(member) {
  const m = MEMBERS[member];
  const reqs = ordered(member);
  const items = [];
  if (MEMBER_LOGINS[member].length) {
    items.push({ name: '00 Setup - Login (common)', item: MEMBER_LOGINS[member].map(loginItem) });
  }
  m.features.forEach((title, i) => {
    items.push({ name: `Feature 0${i + 1} - ${title}`, item: reqs.filter((r) => r.feature === i + 1).map(toItem) });
  });
  return {
    info: {
      name: `MedFind BD - Member ${member} - ${m.name} (${m.studentId})`,
      description: `CSE471 Group 02, Section 03. Member ${member}: ${m.name} (${m.studentId}).\nServer: npm run start:member${member} -> http://127.0.0.1:${m.port}\nFeature 01: ${m.features[0]}\nFeature 02: ${m.features[1]}\n\nRun "npm run seed" first. Requests are ordered: run the folder top to bottom (or use the Collection Runner).`,
      schema: SCHEMA,
    },
    event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: PICKUP_SCRIPT } }],
    variable: variables(member),
    item: items,
  };
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log('wrote', path.relative(OUT, file));
}

const all = [];
for (const member of [1, 2, 3, 4]) {
  const c = memberCollection(member);
  write(path.join(OUT, `Member${member}`, `Member${member}_${MEMBERS[member].studentId}.postman_collection.json`), c);
  write(path.join(OUT, 'environments', `Member${member}_${MEMBERS[member].port}.postman_environment.json`), {
    name: `MedFind BD - Member ${member} (port ${MEMBERS[member].port})`,
    values: [{ key: 'baseUrl', value: `http://127.0.0.1:${MEMBERS[member].port}`, enabled: true }],
  });
  all.push(c);
}

// Master collection: every member folder, each with its own baseUrl override via folder-level pre-request script
write(path.join(OUT, 'Master_Collection', 'MedFind_BD_Master.postman_collection.json'), {
  info: {
    name: 'MedFind BD - Master Collection (all 8 features)',
    description: 'Runs against the all-features server (npm start -> http://127.0.0.1:5000). Run "npm run seed" first; run the member folders in order 1 -> 4.',
    schema: SCHEMA,
  },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: PICKUP_SCRIPT } }],
  variable: [
    { key: 'baseUrl', value: 'http://127.0.0.1:5000' }, { key: 'pickupDate', value: '' },
    ...Object.entries(SEED).map(([key, value]) => ({ key, value })),
    ...Object.keys(LOGINS).map((key) => ({ key, value: '' })),
  ],
  item: [
    { name: '00 Setup - Login all demo roles', item: Object.keys(LOGINS).map(loginItem) },
    ...all.map((c, i) => ({ name: `Member ${i + 1} - ${MEMBERS[i + 1].name}`, item: c.item.filter((f) => !f.name.startsWith('00')) })),
  ],
});
write(path.join(OUT, 'environments', 'All_Features_5000.postman_environment.json'), {
  name: 'MedFind BD - All features (port 5000)',
  values: [{ key: 'baseUrl', value: 'http://127.0.0.1:5000', enabled: true }],
});
