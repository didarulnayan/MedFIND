/**
 * Generates documentation/API_DOCUMENTATION.md and documentation/MEMBER_CONTRIBUTION.md from the request spec,
 * the real route files and the Newman run reports.   node scripts/docs/build-markdown.js
 */
const fs = require('fs');
const path = require('path');
const { MEMBERS, REQUESTS, ORDER } = require('../postman/spec');

const ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(ROOT, 'documentation');
fs.mkdirSync(DOCS, { recursive: true });

const ROUTE_FILES = {
  1: ['catalog.routes.js', 'stock.routes.js'],
  2: ['reservationRequest.routes.js', 'reservationStatus.routes.js'],
  3: ['search.routes.js', 'nearby.routes.js'],
  4: ['verification.routes.js', 'complaint.routes.js'],
};
const SERVICE_FILES = {
  1: ['catalog.service.js', 'stock.service.js', 'inventory.service.js (shared stock engine)'],
  2: ['reservationRequest.service.js', 'reservationStatus.service.js'],
  3: ['search.service.js', 'nearby.service.js'],
  4: ['verification.service.js', 'complaint.service.js'],
};

function routesOf(file) {
  const text = fs.readFileSync(path.join(ROOT, 'backend/src/routes', file), 'utf8');
  return [...text.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)',(.*)ctrl\.(\w+)\);/g)].map((m) => {
    const mw = m[3];
    let access = 'Public';
    if (/\bowner\b/.test(mw)) access = 'Owner';
    else if (/\badmin\b/.test(mw)) access = 'Admin';
    else if (/\bpatient\b/.test(mw)) access = 'Patient';
    else if (/authenticate/.test(mw)) access = 'Any logged-in user (ownership checked)';
    return { method: m[1].toUpperCase(), path: `/api${m[2]}`, access, handler: m[4], upload: /imageUpload/.test(mw) };
  });
}

function responses(member) {
  const f = path.join(ROOT, 'postman/newman-reports', `Member${member}.json`);
  if (!fs.existsSync(f)) return {};
  const run = JSON.parse(fs.readFileSync(f, 'utf8')).run;
  const out = {};
  for (const ex of run.executions) {
    const id = ex.item.name.split(' ')[0];
    const r = ex.response || {};
    out[id] = { code: r.code, body: Buffer.from((r.stream && r.stream.data) || []).toString('utf8') };
  }
  return out;
}

function excerpt(body, max = 30) {
  let t;
  try { t = JSON.stringify(JSON.parse(body), null, 2); } catch { t = body; }
  const lines = t.split('\n');
  return lines.length > max ? [...lines.slice(0, max), '  ...'].join('\n') : t;
}

// ---------------- API_DOCUMENTATION.md
let api = `# MedFind BD - API Documentation

All responses are JSON:

\`\`\`json
{ "success": true, "message": "Human readable message", "data": { } }
{ "success": false, "message": "What went wrong", "errors": [{ "field": "price", "message": "price must be greater than 0" }] }
\`\`\`

| Status | Meaning in this API |
|---|---|
| 200 | OK |
| 201 | Created (new catalog item, batch, reservation, pharmacy, review, complaint) |
| 400 | Validation failed / malformed JSON / business rule on input (e.g. expired batch, closed at pickup time) |
| 401 | Missing, malformed, invalid or expired JWT |
| 403 | Logged in but wrong role or not the owner of the resource |
| 404 | Resource not found (or not public, e.g. unverified pharmacy) |
| 409 | Conflict with current state (duplicate, insufficient stock, invalid status transition) |
| 500 | Unexpected server error (details are logged, not returned in production) |

**Authentication:** \`Authorization: Bearer <token>\`; get the token from \`POST /api/auth/login\`. Roles: \`patient\`, \`owner\`, \`admin\`.

## Common endpoints (available on every member server)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/health | Public | Server, database and mounted-feature status |
| POST | /api/auth/register | Public | Register a patient or pharmacy owner (\`{ name, email, phone?, password, role }\`) |
| POST | /api/auth/login | Public | Returns \`{ user, token }\` |
| GET | /api/auth/me | Logged in | Current user |
| GET | /api/notifications | Logged in | In-app notifications (reservation, complaint, verification updates) |

`;

const contrib = [`# Member Contribution

CSE471 - Group 02 - Section 03 - Project: **MedFind BD**

Every member owns two features, implemented in separate route / controller / service / validator files and served by
the member's own server on the port made from the last four digits of the student ID. Models, the database connection,
authentication and the stock engine are shared infrastructure.

| Member | Student ID | Port | Feature 01 | Feature 02 | Start command |
|---|---|---|---|---|---|
${[1, 2, 3, 4].map((m) => `| ${MEMBERS[m].name} | ${MEMBERS[m].studentId} | ${MEMBERS[m].port} | ${MEMBERS[m].features[0]} | ${MEMBERS[m].features[1]} | \`npm run start:member${m}\` |`).join('\n')}
`];

for (const m of [1, 2, 3, 4]) {
  const mem = MEMBERS[m];
  const resp = responses(m);
  api += `\n---\n\n## Member ${m} - ${mem.name} (${mem.studentId}) - port ${mem.port}\n`;
  contrib.push(`\n## Member ${m}: ${mem.name} (${mem.studentId})\n\nServer: \`npm run start:member${m}\` -> http://127.0.0.1:${mem.port}\n`);
  ROUTE_FILES[m].forEach((file, fi) => {
    const routes = routesOf(file);
    api += `\n### Feature 0${fi + 1}: ${mem.features[fi]}\n\nRoute file: \`backend/src/routes/${file}\`\n\n| Method | Endpoint | Access | Handler |\n|---|---|---|---|\n`;
    api += routes.map((r) => `| ${r.method} | \`${r.path}\` | ${r.access} | ${r.handler}${r.upload ? ' (multipart upload)' : ''} |`).join('\n') + '\n';
    contrib.push(`### Feature 0${fi + 1}: ${mem.features[fi]}\n\n| Method | Endpoint | Access |\n|---|---|---|\n${routes.map((r) => `| ${r.method} | \`${r.path}\` | ${r.access} |`).join('\n')}\n`);

    for (const id of ORDER[m]) {
      const r = REQUESTS.find((x) => x.id === id);
      if (r.feature !== fi + 1) continue;
      api += `\n#### ${r.id} - ${r.name}${r.doc === 'negative' ? ' (error case)' : ''}\n\n${r.purpose}\n\n`;
      api += `- **Request:** \`${r.method} http://127.0.0.1:${mem.port}${r.path}\`\n`;
      if (r.query) api += `- **Query:** ${Object.entries(r.query).map(([k, v]) => `\`${k}=${v}\``).join(', ')}\n`;
      api += `- **Auth:** ${r.auth ? `Bearer token (${r.auth})` : 'none'}\n- **Expected status:** ${r.expect}\n`;
      if (r.body) api += `\n\`\`\`json\n${JSON.stringify(r.body, null, 2)}\n\`\`\`\n`;
      if (r.form) api += `\nmultipart/form-data: ${r.form.map((f) => (f.file ? `\`${f.key}\` (file)` : `\`${f.key}\``)).join(', ')}\n`;
      const x = resp[r.id];
      if (x) api += `\nResponse (${x.code}, recorded by the Newman run):\n\n\`\`\`json\n${excerpt(x.body)}\n\`\`\`\n`;
    }
  });
  contrib.push(`### Files owned\n\n- Routes: ${ROUTE_FILES[m].map((f) => `\`src/routes/${f}\``).join(', ')}\n- Controllers: ${ROUTE_FILES[m].map((f) => `\`src/controllers/${f.replace('.routes.js', '.controller.js').replace('complaint.controller', 'complaint.controller')}\``).join(', ')}\n- Services: ${SERVICE_FILES[m].map((f) => `\`src/services/${f}\``).join(', ')}\n- Validators: \`src/validators/member${m}.validators.js\`\n- Postman: \`postman/Member${m}/\` - Screenshots: \`screenshots/Member${m}/\` - Submission: \`submissions/Member${m}_Assignment03.docx\`\n`);
}

fs.writeFileSync(path.join(DOCS, 'API_DOCUMENTATION.md'), api);
fs.writeFileSync(path.join(DOCS, 'MEMBER_CONTRIBUTION.md'), contrib.join('\n'));
console.log('wrote documentation/API_DOCUMENTATION.md and MEMBER_CONTRIBUTION.md');
