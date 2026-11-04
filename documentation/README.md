# MedFind BD - Setup and Running Guide

## 1. Overview

MedFind BD is a REST API (Node.js / Express / MongoDB) for discovering and reserving medicines at verified pharmacies.
This repository contains the backend for the 8 Assignment 03 features plus the shared infrastructure they need.

| Role | Can do |
|---|---|
| Patient | search medicines, see nearby pharmacies, reserve, track reservations, review pharmacies, file complaints |
| Pharmacy owner | register a pharmacy with licences, manage catalog and batches, handle reservation requests, respond to complaints |
| Admin | verify / reject pharmacies, review complaints, suspend / reinstate pharmacies, trigger the reservation-expiry job |

## 2. Architecture

```
HTTP request
  -> route (src/routes/*.routes.js)        URL, auth + role middleware, zod validation, uploads
  -> controller (src/controllers/*)         reads req, calls the service, sends JSON
  -> service (src/services/*)               business rules, transactions
  -> Mongoose models (src/models/*)         schemas, validation, indexes
  -> error middleware                       consistent { success:false, message, errors }
```

`src/app.js` builds an Express app with only the requested features. `src/routes/features.js` maps each feature to its
member, so every member server (`server/memberN.js`) exposes the common routes plus exactly that member's two features
on that member's port. One codebase, one database, no duplicated business logic, no port conflicts.

## 3. Installation

```bash
git clone <repo-url> MedFind-BD
cd MedFind-BD/backend
npm install
```

## 4. Environment

Copy `.env.example` to `.env` (a copy is in this folder too). Required:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string including the database name, e.g. `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/medfind_bd?retryWrites=true&w=majority` |
| `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |

Optional: `PORT_MEMBER1..4` (default 9421 / 9050 / 1783 / 1274), `PORT_ALL` (5000), `CLOUDINARY_*` (empty = uploads saved to
`backend/uploads`), `SENDGRID_API_KEY` / `EMAIL_FROM` (empty = emails printed to the console), business rules
(`RESERVATION_*`, `SUSPENSION_*`, `TIMEZONE_OFFSET`), `CRON_ENABLED`.

`.env` is git-ignored. Never commit real credentials.

## 5. Database

### MongoDB Atlas (recommended / shared by the group)
1. Create a free M0 cluster at https://cloud.mongodb.com.
2. *Database Access*: add a database user. *Network Access*: allow your IP (or 0.0.0.0/0 for the lab).
3. *Connect > Drivers*: copy the connection string into `MONGODB_URI`, adding `/medfind_bd` before the `?`.
4. `npm run seed`
5. On Windows, if the connection fails with `querySrv ECONNREFUSED`, use the non-SRV format described in `.env.example`.

### Local MongoDB (offline development)
```bash
mongod --dbpath <data-folder> --replSet rs0 --bind_ip 127.0.0.1
npm run db:init-replset          # once
# MONGODB_URI=mongodb://127.0.0.1:27017/medfind_bd?replicaSet=rs0
npm run seed
```
A replica set is needed because stock reduction and reservation collection run in a transaction.

## 6. Running

| Command | Server |
|---|---|
| `npm run start:member1` | Member 1 - Audrija Chowdhury - port 9421 |
| `npm run start:member2` | Member 2 - Abdullah Al Zahur Rafi - port 9050 |
| `npm run start:member3` | Member 3 - Abdullah Al Muqit - port 1783 |
| `npm run start:member4` | Member 4 - Md Didarul Islam Nayan - port 1274 |
| `npm start` | all features - port 5000 |
| `npm run dev:memberN` | same with auto-restart (`node --watch`) |

Health check: `GET http://127.0.0.1:<port>/api/health` shows the database state and the mounted features.

## 7. Testing

```bash
npm test                                        # 51 automated end-to-end tests (separate _test database)
npx newman run ../postman/Member1/Member1_22299421.postman_collection.json --working-dir ../postman
```

In the Postman app: *Import* the member collection (and optionally the environment from `postman/environments`),
run `npm run seed`, start the member server, then run the collection top to bottom (Collection Runner or one by one).
Login requests in "00 Setup" store tokens automatically; later requests reuse ids captured by earlier ones.
Requests with a file field use `postman/assets/*` - set Postman *Settings > General > Working directory* to the
`postman` folder, or re-select the file in the Body tab.

## 8. Other documents

- [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md) - collections, schemas, relations, indexes, seed accounts
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - every endpoint with examples and recorded responses
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - how the project was built and how to reproduce it
- [MEMBER_CONTRIBUTION.md](MEMBER_CONTRIBUTION.md) - who owns which features, files and endpoints
- [TESTING_REPORT.md](TESTING_REPORT.md) - what was tested and the results
