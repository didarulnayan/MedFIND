# MedFind BD - Implementation Guide

How the backend was built, step by step, and how to reproduce it.

## 1. Requirements analysis

Sources, in priority order:

1. **Functional Requirements document (Assignment 01)** - features, tech stack, business rules.
2. **Figma package (Assignment 02)** - 34 screens across 4 members; the visible text of every SVG was extracted to get
   the exact fields, tabs, filters, status names and messages (e.g. "Within 30 days (3)", "Reason *", "Pickup deadline").
3. **Assignment 03 template** - per-API documentation (URL, method, headers, body, code snippet, Postman screenshot),
   individual submission, port = last 4 digits of the student ID.

Decisions taken where the documents were silent or disagreed:

| Topic | Decision | Why |
|---|---|---|
| Module numbers | Feature-to-member mapping from the Figma package is used (requirements doc lists Catalog in Module 1, Figma package in Module 2) | the Assignment 03 features are the ones designed in Figma |
| "Reservation Status Tracking" text missing in the requirements | behaviour taken from the 5 Figma screens: Pending -> Confirmed -> Ready for pickup -> Collected, reject with reason, cancel before Ready, timeline, pickup deadline, automatic expiry | Figma is the source of truth for interface behaviour |
| Stock in catalog vs batches | every unit lives in a batch; the catalog "stock quantity" field creates/consumes an undated adjustment batch | keeps one consistent stock number (non-expired batches) while supporting both screens |
| Pickup deadline | pickup time + 120 min grace (configurable) | Figma shows a deadline; a grace period avoids expiring at the exact minute |
| Valid complaint | a complaint the admin marked **Resolved**; suspension needs ≥ 3 in 30 days (configurable) | Figma: "Valid complaints in the last 30 days: 3" |
| Verify pharmacy | all 4 checklist items must be confirmed; reject requires a note | Figma verify screen |
| One pharmacy per owner | enforced with a unique index | simplest consistent model for registration |
| Pharmacy demo data | Figma sample values reused where consistent (Lazz Pharma, Napa 500 mg Tk 1.20, 340 units, NP-2411...) | screenshots match the designs |

## 2. Tools and packages

| Tool | Version used | Purpose |
|---|---|---|
| Node.js / npm | 25.9.0 / 11.12 | runtime |
| MongoDB Community server | 8.0.4 (portable, replica set `rs0`) | local development DB; Atlas in deployment |
| Postman desktop | 12.35.2 | manual API testing and screenshots |
| Newman | 6 | Postman collection runner (CLI) |

Runtime dependencies: `express@5`, `mongoose@8`, `bcrypt@6`, `jsonwebtoken@9`, `multer@2`, `cloudinary@2`, `node-cron@4`,
`zod@4.6.7`, `helmet`, `cors`, `morgan`, `dotenv`, `express-rate-limit`, `@sendgrid/mail`.
Dev: `supertest`, `newman`. Tests use the built-in `node:test` runner.

## 3. Build order

1. **Skeleton** - `package.json` scripts, `.env.example`, `src/config` (env validation, DB connection, Cloudinary).
2. **Cross-cutting middleware** - JWT `authenticate`, `authorize(...roles)`, `loadOwnerPharmacy`, zod `validate`,
   multer image upload (PNG/JPG, 5 MB), central error handler mapping Mongoose/validation/duplicate-key/multer errors to 400/409.
3. **Models** - 14 schemas with validation and indexes (see DATABASE_DOCUMENTATION.md).
4. **Shared services** - `inventory.service` (non-expired stock, FEFO consumption, reservable quantity), `storage.service`
   (Cloudinary or local disk), `notification.service` (in-app + SendGrid / console), `transaction.js`.
5. **Feature services** (business logic), then **controllers**, **validators**, **routes** - one set per feature.
6. **App factory + feature registry** - `createApp({ features })`, `routes/features.js`, `server/memberN.js` entry points.
7. **Jobs** - node-cron: reservation expiry every 5 min (Member 2 server), stock refresh + low-stock/expiry alerts hourly (Member 1 server).
8. **Seed** - idempotent, deterministic ids.
9. **Tests** - 51 supertest end-to-end tests over all features (positive + negative).
10. **Postman** - collections generated from one request spec (`scripts/postman/spec.js`), validated with Newman, then every request sent from the Postman desktop app and screenshotted.
11. **Documentation** - Markdown docs and the four DOCX submissions generated from the same spec, real source code and recorded responses.

## 4. Key implementation details

### Stock engine (Member 1, used by Member 2)
- `recalculateStock(item)` sums batches with `quantity > 0` and (`expiryDate = null` or `expiryDate > now`) and caches it in `CatalogItem.stockQuantity`.
- `consumeFEFO(item, qty, session)` sorts live batches by expiry (undated last) and decrements them with a conditional
  update (`quantity >= take`) so concurrent requests cannot oversell; throws 409 if non-expired stock is insufficient.
- `reservableQuantity(item)` = stock − quantities held by Confirmed / Ready reservations.
- Marking a reservation **Collected** runs `consumeFEFO` and the status change in one MongoDB transaction and stores `consumedBatches`.

### Reservations (Member 2)
- Pickup validation: ≥ 30 min ahead, ≤ 7 days, inside the pharmacy's opening hours (Asia/Dhaka, UTC+6).
- Prescription-only medicines require an image; it can be replaced while Pending.
- One active reservation per patient per catalog item.
- Owner transitions are strictly one step forward; anything else returns 409 with the allowed next step.
- `expireOverdueReservations()` is called by node-cron and by `POST /api/admin/reservations/expire-overdue`.

### Search and geo (Member 3)
- Search is a single aggregation: match on brand/generic regex + filters, `$lookup` of active catalog items at public
  pharmacies (with price / stock conditions), computed pharmacy count and price range, `$facet` for pagination.
- Nearby uses `$geoNear` on the `2dsphere` index with the public filter, then `$lookup` of the medicine listing with stock > 0;
  open-now is computed from opening hours in Dhaka time; sorting by distance, price, rating or last stock update.

### Verification, reviews, complaints (Member 4)
- Licence numbers are unique; admins see automated duplicate checks.
- Reviews: only the patient's own **Collected** reservation at that pharmacy, once (unique index), rating recomputed in the same transaction.
- Complaints: ownership checks for patients and owners; status transitions table; resolution note required to close;
  suspension threshold checked against resolved complaints in the last 30 days.

## 5. Debugging log (issues found and fixed)

| Problem | Cause | Fix |
|---|---|---|
| `node --test tests/` failed to start | Node 25 treats a directory argument as a file | test glob `"tests/**/*.test.js"` |
| Review creation returned 500 | `const rating` inside the transaction shadowed the `rating` argument (temporal dead zone) | renamed to `pharmacyRating` |
| Tests expected 409 but got 400/201 | test data issues (name too short, reserving within available stock) | corrected test inputs |
| Postman ids changed after each seed | random ObjectIds | seed uses deterministic ids (MD5 of a stable key) |
| Prescription upload from Postman returned 400 | Postman's cURL import does not attach files | file is attached through Postman's "Select Files" dialog |
| `querySrv ECONNREFUSED` connecting to Atlas from Node on Windows | Node's DNS client queried a local stub (127.0.0.1) that does not answer SRV records | standard non-SRV Atlas connection string (three hosts + replicaSet + tls) |
| Request body not visible in Postman screenshots | Postman switches back to the Params tab after importing a request | Body tab selected after the import settles, then Send clicked |
| `npm audit`: high severity in zod 3 (GHSA-mrhx-c7xc-m3w5, memory exhaustion on oversized arrays) | query/form validators accept arrays | upgraded to zod 4.6.7, migrated `errorMap`/`invalid_type_error` to `error`, capped arrays (20 filter values, 14 opening slots) |
| `npm audit`: 4 low (deepmerge via @sendgrid/mail) | upstream dependency; npm's only "fix" is a downgrade to @sendgrid/mail 6 | kept; SendGrid only merges server-built objects, no user input |

## 6. Reproducing from scratch

```bash
cd backend
npm install
cp .env.example .env          # set MONGODB_URI + JWT_SECRET
npm run seed
npm test                      # expect 51 passing
npm run start:member1 & npm run start:member2 & npm run start:member3 & npm run start:member4
node scripts/postman/build-collections.js       # regenerate collections (optional)
npx newman run ../postman/Member4/Member4_23301274.postman_collection.json --working-dir ../postman
```

Re-run `npm run seed` before running a member collection again: collections create, change and delete data in order.
