# MedFind BD - Testing Report

Test date: 05 November 2026. Environment: Windows 11, Node.js 25.9.0, Postman desktop 12.35.2 (Lightweight API Client), Newman 6.
Databases: **MongoDB Atlas** (free M0 cluster, database `medfind_bd`) and, before Atlas credentials were available,
a local MongoDB 8.0.4 single-node replica set. The Postman screenshots were captured against the local database;
every test layer was then re-run against Atlas with the same results.

## 1. Summary

| Layer | What | Result |
|---|---|---|
| Automated end-to-end tests | `npm test` - 51 supertest tests over all 8 features (positive + negative), separate `_test` database, re-seeded per run | **51 / 51 passed** on local MongoDB (`test-results.txt`) and on **Atlas** (`test-results-atlas.txt`) |
| Postman collections (CLI) | Newman run of each member collection against that member's own server and port | **102 requests, 191 assertions, 0 failures** on local MongoDB and again on **Atlas** (`postman/newman-reports/*-atlas-cli.txt`) |
| Postman desktop (manual-style) | every documented request sent from the Postman desktop app, screenshotted, and its status code cross-checked against the server's own access log | **89 / 89 requests matched the expected status** (`screenshots/MemberN/manifest.json`) |
| Servers / ports | all four member servers running at the same time against the same database | 9421, 9050, 1783, 1274 all healthy on Atlas (`GET /api/health` = 200, database connected) |
| Dependency audit | `npm audit --omit=dev` | 0 high / 0 critical; 4 low (see section 5) |

## 2. Automated tests (`backend/tests/api.test.js`)

| Area | Tests | Examples of what is checked |
|---|---|---|
| Common auth | 3 | missing token 401, wrong role 403, duplicate email 409 |
| M1 F1 Catalog | 7 | master-list flag, status tabs, add 201 / duplicate 409 / invalid 400, price history recorded, other owner 404, soft delete |
| M1 F2 Stock & expiry | 6 | expired batches excluded (Napa = 340), add / duplicate / expired batch, FEFO order and `nextBatchToUse`, recalculation on edit/delete, 30/60/90/expired windows, dispense consumes NP-2411 then NP-2409, insufficient stock 409 |
| M2 F1 Details & request | 6 | only verified pharmacies listed, estimated total, unverified 404, Pending creation, insufficient stock 409, prescription-only 400 / with image 201, closed-at-pickup 400, prescription upload + ownership 403 |
| M2 F2 Status tracking | 7 | tab counts, inbox, invalid transition 409, full workflow with stock reduced by FEFO on Collected, cancel after Ready 409, timeline, stranger 403, reject reason validation, cancel, expiry job + admin-only |
| M3 F1 Search | 5 | generic + brand suggestions, filters, price range + validation, no-results message, facets and popular searches |
| M3 F2 Nearby | 5 | area list + resolve, distance ordering, unverified excluded, price sort, empty state radius suggestions, missing location 400, marker summary |
| M4 F1 Verification & reviews | 7 | register Pending / duplicate 409, hidden until verified, checklist and note rules, resubmission, rating summary, eligible review / duplicate 409 / not collected 403 / rating 6 → 400 |
| M4 F2 Complaints | 5 | evidence upload, ownership 403, invalid 400, owner response + other owner 403, status workflow with final states 409, suspension threshold 409 / suspend hides pharmacy / reinstate |

## 3. Postman verification

Collections: `postman/Member1..4/*.postman_collection.json` (one folder per feature, a "00 Setup" login folder),
`postman/Master_Collection/` (all features, port 5000) and `postman/environments/`. Every request carries test scripts
(status code, `success` flag) and stores ids/tokens for later requests.

Screenshots were produced in the **Postman desktop app**: each request was pasted into Postman as a cURL command,
files were attached through Postman's file dialog, the request was sent with **Send**, and the Postman window was captured.
For every screenshot the status code the server itself logged for that request was recorded in `manifest.json`
and compared with the expected code.

| Member | Port | Requests in Postman | Main APIs | Error-case requests | Status matched server log |
|---|---|---|---|---|---|
| 1 - Audrija Chowdhury | 9421 | 20 | 13 | 7 | 20 / 20 |
| 2 - Abdullah Al Zahur Rafi | 9050 | 21 | 13 | 8 | 21 / 21 |
| 3 - Abdullah Al Muqit | 1783 | 17 | 14 | 3 | 17 / 17 |
| 4 - Md Didarul Islam Nayan | 1274 | 31 | 22 | 9 | 31 / 31 |

The master collection was also run with Newman against the all-features server (port 5000): **96 requests, 185 assertions, 0 failures**.

## 4. Problems found during testing and their resolution

| Problem | Resolution |
|---|---|
| Review creation returned 500 (variable shadowing inside the transaction) | fixed in `verification.service.js`; covered by tests |
| Node 25 would not run `node --test tests/` | test glob in `package.json` |
| Postman ids changed after every seed | deterministic seed ids |
| Postman cURL import does not attach files (upload returned 400 - correctly rejected by the API) | file attached through Postman's "Select Files" dialog; the mismatch was caught by the log cross-check |
| Request body hidden in early screenshots | Body tab selected after import; all screenshots re-captured |
| `mongodb+srv` lookup failed on Windows (`querySrv ECONNREFUSED`) | switched `MONGODB_URI` to the standard non-SRV Atlas format |
| zod 3 high-severity advisory | upgraded to zod 4.6.7, all tests and collections re-run, screenshots re-captured on the final code |

## 5. Known limitations

| Item | Status |
|---|---|
| MongoDB Atlas | Connected and fully tested. On Windows, Node.js may fail `mongodb+srv://` lookups with `querySrv ECONNREFUSED` (Node asks a local DNS stub that does not answer SRV queries); the standard `mongodb://host1,host2,host3/...` format from Atlas avoids this (see `.env.example`). One seed run hit a transient Atlas TLS error (`SSL alert number 80`); re-running succeeded. |
| Cloudinary | Adapter implemented; without `CLOUDINARY_*` keys uploads are stored in `backend/uploads` (this mode was used in testing). Real Cloudinary upload not tested. |
| SendGrid email | Adapter implemented; without `SENDGRID_API_KEY` emails are logged (`[email:mock]`). Real sending not tested. In-app notifications are stored and tested. |
| Postman account features | Screenshots come from the Lightweight API Client (no sign-in). Importing the collections and the Collection Runner need a free Postman account. |
| npm audit | 4 low-severity advisories in `deepmerge` via `@sendgrid/mail`; npm's only fix is a major downgrade. Not exploitable here (no user input reaches the merge). |
| Not implemented (later modules) | frontend (React), bulk CSV/Excel import, online payment sandbox, reservation reorder, featured pharmacies, favourites, map UI, AI medicine information. Price history and low-stock/expiry alerts are implemented in the backend as integration points. |
