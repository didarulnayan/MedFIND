# MedFIND (MedFind BD)

A web-based medicine discovery and pharmacy management platform that connects patients with verified pharmacies. Features include medicine search, real-time stock and price comparison, medicine reservations, pharmacy verification, inventory management, online payments, nearby pharmacy discovery, and AI-powered medicine information.

This repository currently contains the **backend REST API** for the 8 Assignment 03 features: patients search medicines,
find verified pharmacies nearby that stock them, reserve for pickup, review pharmacies and file complaints; pharmacy
owners manage their catalog, batches and expiry; admins verify pharmacies and handle disputes.

CSE471 System Analysis and Design - **Group 02, Section 03** - Assignment 03 (API Postman Collection)

| Member | Student ID | Port | Feature 01 | Feature 02 |
|---|---|---|---|---|
| Audrija Chowdhury | 22299421 | **9421** | Medicine Catalog Management | Stock & Expiry Tracking |
| Abdullah Al Zahur Rafi | 22299050 | **9050** | Medicine Details & Reservation Request | Reservation Status Tracking |
| Abdullah Al Muqit | 22201783 | **1783** | Medicine Search & Filter | Nearby Pharmacies & Sorting |
| Md Didarul Islam Nayan | 23301274 | **1274** | Pharmacy Verification & Reviews | Complaints & Disputes |

## Tech stack

Node.js · Express.js 5 · MongoDB Atlas + Mongoose 8 · JWT + bcrypt · Multer + Cloudinary · node-cron · zod · SendGrid · Postman / Newman

## Folder structure

```
MedFind-BD/
├── backend/
│   ├── src/
│   │   ├── config/        env, MongoDB connection, Cloudinary
│   │   ├── models/        14 Mongoose schemas
│   │   ├── routes/        one router per feature + features.js (member -> feature registry)
│   │   ├── controllers/   HTTP layer
│   │   ├── services/      business logic (inventory engine, reservations, search, geo, verification, complaints...)
│   │   ├── middleware/    auth (JWT + roles), validation, uploads, error handler
│   │   ├── validators/    zod schemas per member
│   │   ├── jobs/          node-cron jobs (reservation expiry, stock refresh + alerts)
│   │   ├── utils/
│   │   ├── app.js         Express app factory (mounts selected features)
│   │   └── server.js      DB connect + listen + jobs
│   ├── server/            member1.js ... member4.js, all.js  (entry points)
│   ├── scripts/           seed.js, init-replset.js, postman/ (collection + screenshot tooling), docs/
│   ├── tests/             api.test.js (51 end-to-end tests)
│   └── .env.example
├── postman/               Member1..4 collections, Master_Collection, environments, assets, newman-reports
├── screenshots/           Member1..4 Postman screenshots + manifest.json (status logged by the server)
├── submissions/           Member1..4_Assignment03.docx
└── documentation/         README, database, API, implementation guide, contributions, testing report
```

## Quick start

Requirements: Node.js 20+ (tested on 25.9), a MongoDB Atlas cluster (or local MongoDB started as a replica set).

```bash
cd backend
npm install
cp .env.example .env        # then set MONGODB_URI and JWT_SECRET
npm run seed                # resets the database with demo data
```

Start **one member's** server (each mounts only that member's two features + common auth):

```bash
npm run start:member1   # http://127.0.0.1:9421
npm run start:member2   # http://127.0.0.1:9050
npm run start:member3   # http://127.0.0.1:1783
npm run start:member4   # http://127.0.0.1:1274
```

All four can run at the same time against the same database. `npm start` runs every feature on port 5000.
Check any server with `GET /api/health`.

Run the automated tests (uses a separate `<db>_test` database):

```bash
npm test
```

More detail: [documentation/README.md](documentation/README.md).

## License

[MIT](LICENSE)
