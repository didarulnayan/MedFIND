# MedFind BD - Database Documentation

**Database:** MongoDB (MongoDB Atlas for the shared/deployed database; a local single-node replica set for development).
**ODM:** Mongoose 8. All schemas live in `backend/src/models/`.

Transactions are used wherever two writes must succeed together (e.g. *mark reservation Collected* + *reduce stock*).
MongoDB transactions require a replica set. Every Atlas cluster already is one; locally, start `mongod --replSet rs0` and run
`npm run db:init-replset` once.

## Entity overview

```
User (patient | owner | admin)
 ├─1:1─ Pharmacy (owner)                ── licence, verification{status, checklist, history}, suspension, rating
 │        ├─1:N─ CatalogItem ──N:1── MasterMedicine
 │        │        ├─1:N─ InventoryBatch      (batch number, quantity, expiry)
 │        │        ├─1:N─ PriceHistory
 │        │        └─1:N─ Alert               (LowStock | NearExpiry | Expired)
 │        ├─1:N─ Reservation ──N:1── User (patient)
 │        │        └─1:1─ Review (only when Collected)
 │        └─1:N─ Complaint ──N:1── User (patient), optional N:1 Reservation
 ├─1:N─ Notification
Area (city/area centre points)   SearchLog (popular searches)   Counter (R-1042 / C-212 codes)
```

## Collections

### users (`User`)
| Field | Type | Rules |
|---|---|---|
| name | String | required, ≤100 |
| email | String | required, **unique**, lowercase, email format |
| phone | String | optional, `01XXXXXXXXX` (11-digit Bangladeshi mobile) |
| password | String | required, ≥8, **bcrypt hash**, `select: false` (never returned) |
| role | String | `patient` \| `owner` \| `admin` (index) |
| isActive | Boolean | default true |

### pharmacies (`Pharmacy`)
| Field | Type | Rules |
|---|---|---|
| owner | ObjectId → User | required, **unique** (one pharmacy per owner) |
| name, phone, email | String | required |
| address.{line, area, city} | String | required |
| location | GeoJSON Point `[lng, lat]` | required, **2dsphere index** |
| openingHours | `[{ day 0-6, open HH:mm, close HH:mm }]` | supports overnight slots |
| licence.tradeLicenceNo / drugLicenceNo | String | required, uppercase, **unique** each |
| licence.documentUrl | String | Cloudinary / local upload |
| verification.status | `Pending` \| `Verified` \| `Rejected` | index, default Pending |
| verification.checklist | 4 booleans | all must be true to verify |
| verification.history | `[{status, note, by, at}]` | audit trail |
| isSuspended, suspension{reason, at, by} | | suspended pharmacies are hidden |
| ratingAverage, ratingCount | Number | recalculated after every review |

**Public filter** (search, details, nearby): `verification.status = 'Verified' AND isSuspended = false`.

### mastermedicines (`MasterMedicine`)
brandName, genericName, manufacturer, strength, dosageForm (`Tablet, Capsule, Syrup, Suspension, Injection, Drops, Cream, Inhaler, Powder`),
unit (`pc, bottle, vial, tube, pack`), requiresPrescription, isActive.
Indexes: **unique** `{brandName, strength, dosageForm, manufacturer}`, `{genericName}`, `{manufacturer}`.

### catalogitems (`CatalogItem`) - a medicine a pharmacy sells
| Field | Type | Rules |
|---|---|---|
| pharmacy, medicine | ObjectId | **unique together** (no duplicate medicine per pharmacy) |
| price | Number | > 0 |
| stockQuantity | Number | ≥ 0 - cached sum of **non-expired** batches |
| minStockLevel | Number | low-stock threshold |
| isActive | Boolean | soft delete (reservations keep working) |
| lastUpdatedAt | Date | shown to customers; refreshed on every owner change |

Virtual `stockStatus`: `Out of stock` (0), `Low stock` (≤ minStockLevel), `In stock`.

### inventorybatches (`InventoryBatch`)
pharmacy, catalogItem, batchNumber (**unique per catalog item**), quantity (remaining), initialQuantity, manufacturingDate,
expiryDate (`null` only for the internal `ADJ-STOCK` adjustment batch), purchasePrice, source (`delivery` \| `adjustment`).
Indexes: `{catalogItem, batchNumber}` unique, `{catalogItem, expiryDate}`, `{pharmacy, expiryDate}`.

### reservations (`Reservation`)
| Field | Notes |
|---|---|
| code | `R-1042`, **unique**, from `counters` |
| patient, pharmacy, catalogItem, medicine | references |
| medicineSnapshot, pharmacySnapshot | copy at request time so history survives catalog changes |
| quantity (1-500), unitPrice, totalPrice | price snapshot |
| pickupAt, pickupDeadline | deadline = pickup + `RESERVATION_PICKUP_GRACE_MINUTES` |
| prescription{url, publicId} | required for prescription-only medicines |
| status | `Pending → Confirmed → ReadyForPickup → Collected`, or `Rejected`, `Cancelled`, `Expired` |
| rejection{reason, message} | reason from a fixed list |
| statusHistory | `[{status, at, by, note}]` timeline |
| consumedBatches | which batches were used when collected (FEFO evidence) |
| reviewed | true once a review exists |

Indexes: `{pharmacy, status, pickupAt}`, `{status, pickupDeadline}` (expiry job), `{patient, createdAt}`.

### reviews (`Review`)
pharmacy, patient, reservation (**unique** - one review per collected reservation), rating (integer 1-5), text (≤1000). Index `{pharmacy, createdAt}`.

### complaints (`Complaint`)
code (`C-212`, unique), patient, pharmacy, targetType (`pharmacy` \| `reservation`), reservation (optional), issueType (fixed list),
description (10-2000), evidence[{url, publicId}] (≤3 images), status (`Open`, `UnderReview`, `Resolved`, `Dismissed`),
pharmacyResponse{message, respondedAt, respondedBy}, resolutionNote, resolvedAt, history[].
Index `{pharmacy, status, resolvedAt}` - used to count *valid (Resolved) complaints in the last 30 days* for suspension.

### Supporting collections
| Collection | Purpose |
|---|---|
| pricehistories | every price change (`catalog-add`, `catalog-edit`) with old/new price and who changed it |
| notifications | in-app notifications (an email is sent alongside through SendGrid, or logged in mock mode) |
| alerts | low-stock / near-expiry / expired alerts generated by the hourly job; partial unique index keeps one open alert per item/batch/type |
| areas | city/area centre points for "Select an area" (2dsphere) |
| searchlogs | normalised search terms with counts (popular searches) |
| counters | sequences for reservation and complaint codes |

## Business rules enforced in the data layer

| Rule | Where |
|---|---|
| Available stock = non-expired batches only | `inventory.service.recalculateStock` |
| Earliest-expiring batch used first; undated adjustment stock last | `inventory.service.consumeFEFO` / `fefoSort` |
| Stock reduced automatically when a reservation is Collected (same transaction) | `reservationStatus.service.advanceStatus` |
| Reservation quantity ≤ stock that is not already promised to Confirmed / Ready reservations | `inventory.service.reservableQuantity` |
| Expired reservations: active reservations past their deadline become Expired | `expireOverdueReservations` (node-cron, every 5 min) |
| Only verified, non-suspended pharmacies are public | `Pharmacy.publicFilter()` |
| Review only after Collected, once per reservation | `verification.service.createReview` + unique index |
| Complaints only on own reservations; responses only by that pharmacy's owner | `complaint.service` |
| Suspension only with ≥ 3 resolved complaints in 30 days (configurable) | `complaint.service.suspendPharmacy` |

## Seeding

```bash
cd backend
npm run seed
```

`scripts/seed.js` **clears the MedFind collections and recreates them**, so it can be run repeatedly without duplicates.
It refuses to run when `NODE_ENV=production` unless `--force` is passed. Seeded ids are deterministic
(MD5 of a stable key), so Postman collections keep working after every re-seed.

Seed content: 12 areas (Dhaka, Chattogram), 30 master medicines, 8 pharmacies (5 verified, 2 pending, 1 rejected),
30 catalog items with 35 batches (including expired and soon-to-expire batches), 18 reservations in every status,
8 reviews, 6 complaints (3 resolved complaints against Care Medicine Corner so suspension can be demonstrated) and
popular searches. All people and pharmacies are fictional.

### Demo accounts (development only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@medfind.test | Admin@12345 |
| Owner - Lazz Pharma (verified) | rahim.owner@medfind.test | Password@123 |
| Owner - Green Life Pharmacy | tanvir.owner@medfind.test | Password@123 |
| Owner - Care Medicine Corner | nusrat.owner@medfind.test | Password@123 |
| Owner - no pharmacy yet | new.owner@medfind.test | Password@123 |
| Owner - Medicare Point (rejected) | sabbir.owner@medfind.test | Password@123 |
| Patient | ayesha@medfind.test / imran@medfind.test / sadia@medfind.test | Password@123 |

These accounts exist only in the seed data. Do not reuse these passwords anywhere real.
