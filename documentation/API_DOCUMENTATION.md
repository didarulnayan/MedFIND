# MedFind BD - API Documentation

All responses are JSON:

```json
{ "success": true, "message": "Human readable message", "data": { } }
{ "success": false, "message": "What went wrong", "errors": [{ "field": "price", "message": "price must be greater than 0" }] }
```

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

**Authentication:** `Authorization: Bearer <token>`; get the token from `POST /api/auth/login`. Roles: `patient`, `owner`, `admin`.

## Common endpoints (available on every member server)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/health | Public | Server, database and mounted-feature status |
| POST | /api/auth/register | Public | Register a patient or pharmacy owner (`{ name, email, phone?, password, role }`) |
| POST | /api/auth/login | Public | Returns `{ user, token }` |
| GET | /api/auth/me | Logged in | Current user |
| GET | /api/notifications | Logged in | In-app notifications (reservation, complaint, verification updates) |


---

## Member 1 - Audrija Chowdhury (22299421) - port 9421

### Feature 01: Medicine Catalog Management

Route file: `backend/src/routes/catalog.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/master-medicines` | Owner | searchMasterList |
| GET | `/api/owner/catalog` | Owner | listCatalog |
| POST | `/api/owner/catalog` | Owner | addToCatalog |
| GET | `/api/owner/catalog/:itemId` | Owner | getCatalogItem |
| PATCH | `/api/owner/catalog/:itemId` | Owner | updateCatalogItem |
| DELETE | `/api/owner/catalog/:itemId` | Owner | removeCatalogItem |
| GET | `/api/owner/catalog/:itemId/price-history` | Owner | priceHistory |

#### M1-F1-N4 - Missing token (401) (error case)

Requests without a JWT are rejected.

- **Request:** `GET http://127.0.0.1:9421/api/owner/catalog`
- **Auth:** none
- **Expected status:** 401

Response (401, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Missing or malformed Authorization header (expected: Bearer <token>)"
}
```

#### M1-F1-N3 - Patient cannot manage a catalog (403) (error case)

Role-based access: only pharmacy owners can use catalog APIs.

- **Request:** `GET http://127.0.0.1:9421/api/owner/catalog`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 403

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "This action requires role: owner"
}
```

#### M1-F1-01 - Search master medicine list

Step 1 of "Add medicine": search the platform master list (brand, generic, manufacturer, strength, dosage form) and see which medicines are already in the catalog.

- **Request:** `GET http://127.0.0.1:9421/api/master-medicines`
- **Query:** `search=ostocal`, `page=1`, `limit=10`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Master medicine list",
  "data": {
    "medicines": [
      {
        "id": "7dbbf2400fd851ca9742fcbc",
        "brandName": "Ostocal",
        "genericName": "Calcium + Vitamin D3",
        "manufacturer": "Square Pharmaceuticals",
        "strength": "500 mg + 200 IU",
        "dosageForm": "Tablet",
        "requiresPrescription": false,
        "alreadyInCatalog": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### M1-F1-02 - View medicine catalog

List the medicines the pharmacy sells with price, stock, stock status, last-updated time and tab counts (All / In stock / Low stock / Out of stock).

- **Request:** `GET http://127.0.0.1:9421/api/owner/catalog`
- **Query:** `status=all`, `page=1`, `limit=10`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Medicine catalog",
  "data": {
    "counts": {
      "all": 9,
      "inStock": 7,
      "lowStock": 1,
      "outOfStock": 1
    },
    "items": [
      {
        "id": "209fc9c7d78228e98d3e949e",
        "medicine": {
          "id": "3bec8373567f1e169fbef9cb",
          "brandName": "Napa",
          "genericName": "Paracetamol",
          "manufacturer": "Beximco Pharmaceuticals",
          "strength": "500 mg",
          "dosageForm": "Tablet",
          "requiresPrescription": false
        },
        "price": 1.2,
        "stockQuantity": 340,
        "minStockLevel": 50,
        "stockStatus": "In stock",
        "lastUpdatedAt": "2026-11-04T17:55:59.218Z"
      },
      {
        "id": "cb9a6bea412a941b4e6c5e3d",
  ...
```

#### M1-F1-03 - Add medicine to catalog

Add a master-list medicine to the catalog with the pharmacy's own selling price, stock quantity and minimum stock level. Sets "last updated" to now and records the first price in price history.

- **Request:** `POST http://127.0.0.1:9421/api/owner/catalog`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 201

```json
{
  "masterMedicineId": "7dbbf2400fd851ca9742fcbc",
  "price": 9.5,
  "stockQuantity": 120,
  "minStockLevel": 20
}
```

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Medicine added to catalog",
  "data": {
    "id": "6aeb8dd572dad8d54ca52f64",
    "medicine": {
      "id": "7dbbf2400fd851ca9742fcbc",
      "brandName": "Ostocal",
      "genericName": "Calcium + Vitamin D3",
      "manufacturer": "Square Pharmaceuticals",
      "strength": "500 mg + 200 IU",
      "dosageForm": "Tablet",
      "requiresPrescription": false
    },
    "price": 9.5,
    "stockQuantity": 120,
    "minStockLevel": 20,
    "stockStatus": "In stock",
    "lastUpdatedAt": "2026-11-04T19:56:05.547Z"
  }
}
```

#### M1-F1-N1 - Add duplicate medicine (409) (error case)

Adding a medicine that is already in the catalog is rejected.

- **Request:** `POST http://127.0.0.1:9421/api/owner/catalog`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 409

```json
{
  "masterMedicineId": "3bec8373567f1e169fbef9cb",
  "price": 1.2,
  "stockQuantity": 10
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Napa 500 mg is already in your catalog"
}
```

#### M1-F1-N2 - Invalid medicine data (400) (error case)

Invalid id, negative price and missing stock quantity are rejected with field errors.

- **Request:** `POST http://127.0.0.1:9421/api/owner/catalog`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 400

```json
{
  "masterMedicineId": "abc",
  "price": -5
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "masterMedicineId",
      "message": "masterMedicineId must be a valid id"
    },
    {
      "field": "price",
      "message": "price must be greater than 0"
    },
    {
      "field": "stockQuantity",
      "message": "stockQuantity must be a number"
    }
  ]
}
```

#### M1-F1-04 - View one catalog medicine

Open a catalog medicine (Edit page data): read-only master-list details plus the pharmacy's price, stock and minimum level.

- **Request:** `GET http://127.0.0.1:9421/api/owner/catalog/{{catalogItemId}}`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Catalog medicine",
  "data": {
    "id": "6aeb8dd572dad8d54ca52f64",
    "medicine": {
      "id": "7dbbf2400fd851ca9742fcbc",
      "brandName": "Ostocal",
      "genericName": "Calcium + Vitamin D3",
      "manufacturer": "Square Pharmaceuticals",
      "strength": "500 mg + 200 IU",
      "dosageForm": "Tablet",
      "requiresPrescription": false
    },
    "price": 9.5,
    "stockQuantity": 120,
    "minStockLevel": 20,
    "stockStatus": "In stock",
    "lastUpdatedAt": "2026-11-04T19:56:05.547Z"
  }
}
```

#### M1-F1-05 - Edit catalog medicine (price & stock)

Update selling price and/or stock quantity. A price change is recorded in price history; a stock change is applied through inventory batches; "last updated" is refreshed.

- **Request:** `PATCH http://127.0.0.1:9421/api/owner/catalog/{{catalogItemId}}`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "price": 10,
  "stockQuantity": 150,
  "minStockLevel": 25
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Catalog medicine updated",
  "data": {
    "id": "6aeb8dd572dad8d54ca52f64",
    "medicine": {
      "id": "7dbbf2400fd851ca9742fcbc",
      "brandName": "Ostocal",
      "genericName": "Calcium + Vitamin D3",
      "manufacturer": "Square Pharmaceuticals",
      "strength": "500 mg + 200 IU",
      "dosageForm": "Tablet",
      "requiresPrescription": false
    },
    "price": 10,
    "stockQuantity": 150,
    "minStockLevel": 25,
    "stockStatus": "In stock",
    "lastUpdatedAt": "2026-11-04T19:56:05.961Z"
  }
}
```

#### M1-F1-06 - Remove medicine from catalog

Remove a medicine from the catalog. Customers no longer see it; existing reservations keep their snapshot and are not affected.

- **Request:** `DELETE http://127.0.0.1:9421/api/owner/catalog/{{catalogItemId}}`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Medicine removed from catalog",
  "data": {
    "id": "6aeb8dd572dad8d54ca52f64",
    "medicine": "Ostocal 500 mg + 200 IU",
    "removed": true
  }
}
```

### Feature 02: Stock & Expiry Tracking

Route file: `backend/src/routes/stock.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/owner/stock/overview` | Owner | overview |
| POST | `/api/owner/stock/batches` | Owner | addBatch |
| GET | `/api/owner/stock/items/:itemId/batches` | Owner | listBatches |
| PATCH | `/api/owner/stock/batches/:batchId` | Owner | updateBatch |
| DELETE | `/api/owner/stock/batches/:batchId` | Owner | deleteBatch |
| GET | `/api/owner/stock/expiry` | Owner | expiryInventory |
| POST | `/api/owner/stock/items/:itemId/dispense` | Owner | dispense |

#### M1-F2-01 - Stock overview

Summary cards (medicines tracked, available units, batches expiring in 30 days, expired batches) and one row per medicine with available stock (non-expired batches only), batch count and earliest expiry.

- **Request:** `GET http://127.0.0.1:9421/api/owner/stock/overview`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Stock overview",
  "data": {
    "summary": {
      "medicinesTracked": 9,
      "availableUnits": 1273,
      "expiringIn30Days": 2,
      "expiredBatches": 2
    },
    "items": [
      {
        "catalogItemId": "209fc9c7d78228e98d3e949e",
        "medicine": {
          "id": "3bec8373567f1e169fbef9cb",
          "brandName": "Napa",
          "genericName": "Paracetamol",
          "strength": "500 mg",
          "dosageForm": "Tablet"
        },
        "availableStock": 340,
        "batches": 4,
        "expiredBatches": 1,
        "earliestExpiry": "2026-12-11T19:55:59.218Z",
        "minStockLevel": 50,
        "status": "In stock"
      },
      {
        "catalogItemId": "cb9a6bea412a941b4e6c5e3d",
        "medicine": {
  ...
```

#### M1-F2-02 - Add stock batch

Record a delivery as a batch with batch number, quantity, manufacturing date, expiry date and purchase price. Available stock is recalculated from non-expired batches.

- **Request:** `POST http://127.0.0.1:9421/api/owner/stock/batches`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 201

```json
{
  "catalogItemId": "209fc9c7d78228e98d3e949e",
  "batchNumber": "NP-2501",
  "quantity": 200,
  "manufacturingDate": "2026-06-10",
  "expiryDate": "2028-06-10",
  "purchasePrice": 0.85
}
```

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Stock batch added",
  "data": {
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "strength": "500 mg",
      "dosageForm": "Tablet"
    },
    "batch": {
      "id": "6aeb8dd672dad8d54ca52f96",
      "batchNumber": "NP-2501",
      "quantity": 200,
      "initialQuantity": 200,
      "manufacturingDate": "2026-06-10T00:00:00.000Z",
      "expiryDate": "2028-06-10T00:00:00.000Z",
      "purchasePrice": 0.85,
      "source": "delivery",
      "timeLeft": "1 year",
      "daysLeft": 584,
      "status": "Good"
    },
    "availableStock": 540
  }
}
```

#### M1-F2-N2 - Duplicate batch number (409) (error case)

Batch numbers are unique per medicine.

- **Request:** `POST http://127.0.0.1:9421/api/owner/stock/batches`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 409

```json
{
  "catalogItemId": "209fc9c7d78228e98d3e949e",
  "batchNumber": "NP-2412",
  "quantity": 10,
  "expiryDate": "2028-01-01"
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Batch NP-2412 already exists for this medicine"
}
```

#### M1-F2-N1 - Expired batch rejected (400) (error case)

A batch whose expiry date has already passed cannot be added as stock.

- **Request:** `POST http://127.0.0.1:9421/api/owner/stock/batches`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 400

```json
{
  "catalogItemId": "209fc9c7d78228e98d3e949e",
  "batchNumber": "NP-OLD1",
  "quantity": 50,
  "expiryDate": "2025-12-31"
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Expiry date must be in the future; expired stock cannot be added"
}
```

#### M1-F2-03 - View medicine batches (FEFO order)

All batches of one medicine in the order they will be used (earliest expiry first), with time left, status, available vs expired units and the next batch to use.

- **Request:** `GET http://127.0.0.1:9421/api/owner/stock/items/209fc9c7d78228e98d3e949e/batches`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Medicine batches",
  "data": {
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "strength": "500 mg",
      "dosageForm": "Tablet"
    },
    "availableStock": 540,
    "expiredUnits": 60,
    "nextBatchToUse": {
      "id": "6aeb8dd09f44bd620e171e4e",
      "batchNumber": "NP-2411",
      "expiryDate": "2026-12-11T19:55:59.218Z"
    },
    "batches": [
      {
        "id": "6aeb8dd09f44bd620e171e54",
        "batchNumber": "NP-2301",
        "quantity": 60,
        "initialQuantity": 60,
        "manufacturingDate": "2024-12-04T19:55:59.218Z",
        "expiryDate": "2026-09-30T19:55:59.218Z",
        "purchasePrice": 0.9,
        "source": "delivery",
        "timeLeft": "Expired",
        "daysLeft": -35,
  ...
```

#### M1-F2-04 - Edit stock batch

Correct a batch (quantity, dates, purchase price). Stock is recalculated.

- **Request:** `PATCH http://127.0.0.1:9421/api/owner/stock/batches/{{batchId}}`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "quantity": 180
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Batch updated",
  "data": {
    "batch": {
      "id": "6aeb8dd672dad8d54ca52f96",
      "batchNumber": "NP-2501",
      "quantity": 180,
      "initialQuantity": 200,
      "manufacturingDate": "2026-06-10T00:00:00.000Z",
      "expiryDate": "2028-06-10T00:00:00.000Z",
      "purchasePrice": 0.85,
      "source": "delivery",
      "timeLeft": "1 year",
      "daysLeft": 584,
      "status": "Good"
    },
    "availableStock": 520
  }
}
```

#### M1-F2-05 - Expiry inventory (30 / 60 / 90 days)

Batches expiring within the selected window (30, 60 or 90 days) or already expired, with counts for every window.

- **Request:** `GET http://127.0.0.1:9421/api/owner/stock/expiry`
- **Query:** `window=30`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Expiry inventory",
  "data": {
    "window": "30 days",
    "counts": {
      "within30Days": 2,
      "within60Days": 4,
      "within90Days": 6,
      "expired": 2
    },
    "batches": [
      {
        "catalogItemId": "74b69d848a77075e3a3f381f",
        "medicine": {
          "id": "f0d40c262d508a24feeb4563",
          "brandName": "Seclo 20",
          "genericName": "Omeprazole",
          "strength": "20 mg",
          "dosageForm": "Capsule"
        },
        "id": "6aeb8dd09f44bd620e171e5b",
        "batchNumber": "SC-2208",
        "quantity": 18,
        "initialQuantity": 18,
        "manufacturingDate": "2026-05-08T19:55:59.218Z",
        "expiryDate": "2026-11-24T19:55:59.218Z",
        "purchasePrice": 4.5,
        "source": "delivery",
        "timeLeft": "20 days",
  ...
```

#### M1-F2-06 - Dispense stock (earliest-expiring batch first)

Counter sale: removes units using the earliest-expiring non-expired batch first (the same engine used when a reservation is collected). Expired batches are never used.

- **Request:** `POST http://127.0.0.1:9421/api/owner/stock/items/209fc9c7d78228e98d3e949e/dispense`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "quantity": 130,
  "note": "Walk-in sale"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Stock dispensed (earliest expiry first)",
  "data": {
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "strength": "500 mg",
      "dosageForm": "Tablet"
    },
    "dispensed": 130,
    "note": "Walk-in sale",
    "consumedBatches": [
      {
        "batch": "6aeb8dd09f44bd620e171e4e",
        "batchNumber": "NP-2411",
        "quantity": 120
      },
      {
        "batch": "6aeb8dd09f44bd620e171e52",
        "batchNumber": "NP-2409",
        "quantity": 10
      }
    ],
    "availableStock": 390
  }
}
```

#### M1-F2-N3 - Insufficient non-expired stock (409) (error case)

Dispensing more than the non-expired stock is rejected.

- **Request:** `POST http://127.0.0.1:9421/api/owner/stock/items/209fc9c7d78228e98d3e949e/dispense`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 409

```json
{
  "quantity": 5000
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Insufficient non-expired stock: requested 5000, available 390"
}
```

#### M1-F2-07 - Remove stock batch

Delete a wrongly entered batch; available stock is recalculated.

- **Request:** `DELETE http://127.0.0.1:9421/api/owner/stock/batches/{{batchId}}`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Batch removed",
  "data": {
    "deletedBatch": "NP-2501",
    "availableStock": 210
  }
}
```

---

## Member 2 - Abdullah Al Zahur Rafi (22299050) - port 9050

### Feature 01: Medicine Details & Reservation Request

Route file: `backend/src/routes/reservationRequest.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/medicines/:medicineId` | Public | medicineDetails |
| GET | `/api/medicines/:medicineId/pharmacies/:pharmacyId/availability` | Public | availability |
| POST | `/api/reservations` | Patient | createReservation (multipart upload) |
| PUT | `/api/reservations/:id/prescription` | Patient | uploadPrescription (multipart upload) |

#### M2-F1-01 - Medicine details with pharmacy availability

Medicine details page: medicine information, prescription requirement, price range and every verified pharmacy that lists it with price, reported stock, rating and last-updated time.

- **Request:** `GET http://127.0.0.1:9050/api/medicines/3bec8373567f1e169fbef9cb`
- **Query:** `sort=price`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Medicine details",
  "data": {
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "manufacturer": "Beximco Pharmaceuticals",
      "strength": "500 mg",
      "dosageForm": "Tablet",
      "unit": "pc",
      "requiresPrescription": false
    },
    "prescription": "Prescription: not required",
    "disclaimer": "Used for general medicine information only. Ask your pharmacist or doctor for medical advice.",
    "priceRange": {
      "min": 1,
      "max": 1.5,
      "unit": "pc"
    },
    "pharmacyCount": 5,
    "pharmacies": [
      {
        "catalogItemId": "edbb2441e262aa3e846986b0",
        "pharmacy": {
          "id": "762db1f8dd93e1a8c9999f02",
          "name": "Tamanna Pharmacy",
          "area": "Mirpur 1",
          "address": "Plot 5, Section 1 Main Road, Mirpur 1, Dhaka",
  ...
```

#### M2-F1-02 - Pharmacy availability & reservation summary

Reservation form summary for one pharmacy: price per unit, reported stock, units that can still be reserved, estimated total, prescription requirement and pickup rules.

- **Request:** `GET http://127.0.0.1:9050/api/medicines/3bec8373567f1e169fbef9cb/pharmacies/0367672641e1463cf4ee98cd/availability`
- **Query:** `quantity=10`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy availability",
  "data": {
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "manufacturer": "Beximco Pharmaceuticals",
      "strength": "500 mg",
      "dosageForm": "Tablet",
      "unit": "pc",
      "requiresPrescription": false
    },
    "pharmacy": {
      "id": "0367672641e1463cf4ee98cd",
      "name": "Lazz Pharma",
      "area": "Mirpur 10",
      "address": "House 12, Road 3, Mirpur 10, Dhaka",
      "verified": true,
      "rating": 4.8,
      "ratingCount": 5,
      "openNow": false,
      "openingHours": "Daily 9:00 AM - 10:00 PM"
    },
    "catalogItemId": "209fc9c7d78228e98d3e949e",
    "pricePerUnit": 1.2,
    "reportedStock": 340,
    "lastUpdatedAt": "2026-11-04T17:56:07.757Z",
    "reservableQuantity": 340,
  ...
```

#### M2-F1-N4 - Unverified pharmacy (404) (error case)

Pharmacies that are not verified cannot be reserved from.

- **Request:** `GET http://127.0.0.1:9050/api/medicines/3bec8373567f1e169fbef9cb/pharmacies/24157e5f946b95812b4b9b3d/availability`
- **Auth:** none
- **Expected status:** 404

Response (404, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Pharmacy not found or not verified"
}
```

#### M2-F1-03 - Send reservation request

Patient reserves a medicine: quantity, preferred pickup date and time, optional note and optional prescription image (required for prescription-only medicines). The request is created as "Pending" and the owner is notified.

- **Request:** `POST http://127.0.0.1:9050/api/reservations`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 201

multipart/form-data: `medicineId`, `pharmacyId`, `quantity`, `pickupDate`, `pickupTime`, `note`

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation request sent",
  "data": {
    "reservation": {
      "id": "6aeb8dde98cb47d48631c371",
      "code": "R-1019",
      "status": "Pending",
      "statusLabel": "Pending",
      "medicine": "Napa 500 mg x 10",
      "pharmacy": "Lazz Pharma, Mirpur 10",
      "quantity": 10,
      "unitPrice": 1.2,
      "estimatedTotal": 12,
      "pickupAt": "2026-11-06T12:00:00.000Z",
      "pickupDeadline": "2026-11-06T14:00:00.000Z",
      "prescriptionUrl": null
    },
    "message": "Lazz Pharma will confirm your reservation soon."
  }
}
```

#### M2-F1-04 - Upload prescription image

Attach or replace the prescription image while the reservation is still Pending (PNG/JPG up to 5 MB).

- **Request:** `PUT http://127.0.0.1:9050/api/reservations/{{reservationId}}/prescription`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 200

multipart/form-data: `prescription` (file)

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Prescription uploaded",
  "data": {
    "id": "6aeb8dde98cb47d48631c371",
    "code": "R-1019",
    "prescriptionUrl": "/uploads/prescriptions/1793822174218-7f214214af6e.png"
  }
}
```

#### M2-F1-N1 - Prescription-only medicine without prescription (400) (error case)

Zimax 500 (azithromycin) requires a prescription image.

- **Request:** `POST http://127.0.0.1:9050/api/reservations`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 400

```json
{
  "medicineId": "1033d6bfeec8147b31105b9f",
  "pharmacyId": "0367672641e1463cf4ee98cd",
  "quantity": 3,
  "pickupDate": "{{pickupDate}}",
  "pickupTime": "18:00"
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Zimax 500 is a prescription-only medicine. Please upload a prescription image."
}
```

#### M2-F1-N2 - Quantity exceeds available stock (409) (error case)

Reservations cannot exceed the stock that can still be promised.

- **Request:** `POST http://127.0.0.1:9050/api/reservations`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 409

```json
{
  "medicineId": "3bec8373567f1e169fbef9cb",
  "pharmacyId": "762db1f8dd93e1a8c9999f02",
  "quantity": 200,
  "pickupDate": "{{pickupDate}}",
  "pickupTime": "18:00"
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Only 120 unit(s) can be reserved at this pharmacy right now"
}
```

#### M2-F1-N3 - Pickup time outside opening hours (400) (error case)

Lazz Pharma closes at 10:00 PM.

- **Request:** `POST http://127.0.0.1:9050/api/reservations`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 400

```json
{
  "medicineId": "f0d40c262d508a24feeb4563",
  "pharmacyId": "0367672641e1463cf4ee98cd",
  "quantity": 2,
  "pickupDate": "{{pickupDate}}",
  "pickupTime": "23:30"
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "The pharmacy is closed at the selected pickup time (Daily 9:00 AM - 10:00 PM)"
}
```

### Feature 02: Reservation Status Tracking

Route file: `backend/src/routes/reservationStatus.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/reservations/my` | Patient | myReservations |
| GET | `/api/reservations/:id` | Any logged-in user (ownership checked) | getReservation |
| PATCH | `/api/reservations/:id/cancel` | Patient | cancelReservation |
| GET | `/api/owner/reservations` | Owner | ownerInbox |
| PATCH | `/api/owner/reservations/:id/status` | Owner | advanceStatus |
| PATCH | `/api/owner/reservations/:id/reject` | Owner | rejectReservation |
| POST | `/api/admin/reservations/expire-overdue` | Admin | expireOverdue |

#### M2-F2-01 - My reservations

Patient's reservations with tab counts (All / Active / Completed / Cancelled), status and pickup time.

- **Request:** `GET http://127.0.0.1:9050/api/reservations/my`
- **Query:** `tab=all`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "My reservations",
  "data": {
    "counts": {
      "all": 7,
      "active": 3,
      "completed": 4,
      "cancelled": 0
    },
    "reservations": [
      {
        "id": "6aeb8dde98cb47d48631c371",
        "code": "R-1019",
        "medicine": "Napa 500 mg x 10",
        "pharmacy": "Lazz Pharma",
        "quantity": 10,
        "totalPrice": 12,
        "pickupAt": "2026-11-06T12:00:00.000Z",
        "status": "Pending",
        "statusLabel": "Pending"
      },
      {
        "id": "6aeb8ddbd346b37c89b2a27c",
        "code": "R-1018",
        "medicine": "Fexo 120 120 mg x 5",
        "pharmacy": "Tamanna Pharmacy",
        "quantity": 5,
        "totalPrice": 42.5,
        "pickupAt": "2026-11-04T04:00:00.000Z",
  ...
```

#### M2-F2-02 - Owner reservation inbox

Pharmacy owner inbox with counts (Pending, Confirmed, Ready for pickup, Collected today) and requests including patient name and phone.

- **Request:** `GET http://127.0.0.1:9050/api/owner/reservations`
- **Query:** `status=Pending`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation requests",
  "data": {
    "counts": {
      "pending": 4,
      "confirmed": 0,
      "readyForPickup": 0,
      "collectedToday": 0
    },
    "reservations": [
      {
        "id": "6aeb8ddad346b37c89b2a26a",
        "code": "R-1012",
        "medicine": "Seclo 20 20 mg x 4",
        "pharmacy": "Lazz Pharma",
        "quantity": 4,
        "totalPrice": 24,
        "pickupAt": "2026-11-06T11:00:00.000Z",
        "status": "Pending",
        "statusLabel": "Pending",
        "patient": {
          "name": "Imran Hossain",
          "phone": "01819222333"
        }
      },
      {
        "id": "6aeb8ddad346b37c89b2a267",
        "code": "R-1011",
        "medicine": "Napa 500 mg x 10",
  ...
```

#### M2-F2-03 - Confirm availability (Pending -> Confirmed)

Owner moves the reservation one step forward. Stock that can be promised is re-checked before confirming.

- **Request:** `PATCH http://127.0.0.1:9050/api/owner/reservations/{{reservationId}}/status`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "status": "Confirmed",
  "note": "Availability confirmed"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation status updated",
  "data": {
    "id": "6aeb8dde98cb47d48631c371",
    "code": "R-1019",
    "medicine": "Napa 500 mg x 10",
    "pharmacy": "Lazz Pharma",
    "quantity": 10,
    "totalPrice": 12,
    "pickupAt": "2026-11-06T12:00:00.000Z",
    "status": "Confirmed",
    "statusLabel": "Confirmed",
    "remainingStock": 340,
    "nextStatus": "ReadyForPickup"
  }
}
```

#### M2-F2-04 - Mark ready for pickup (Confirmed -> Ready for pickup)

Second step of the workflow.

- **Request:** `PATCH http://127.0.0.1:9050/api/owner/reservations/{{reservationId}}/status`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "status": "ReadyForPickup"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation status updated",
  "data": {
    "id": "6aeb8dde98cb47d48631c371",
    "code": "R-1019",
    "medicine": "Napa 500 mg x 10",
    "pharmacy": "Lazz Pharma",
    "quantity": 10,
    "totalPrice": 12,
    "pickupAt": "2026-11-06T12:00:00.000Z",
    "status": "ReadyForPickup",
    "statusLabel": "Ready for pickup",
    "remainingStock": 340,
    "nextStatus": "Collected"
  }
}
```

#### M2-F2-05 - Mark collected (stock reduces automatically)

Final step. In one transaction the status becomes Collected and stock is reduced using the earliest-expiring batch first.

- **Request:** `PATCH http://127.0.0.1:9050/api/owner/reservations/{{reservationId}}/status`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "status": "Collected"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation status updated",
  "data": {
    "id": "6aeb8dde98cb47d48631c371",
    "code": "R-1019",
    "medicine": "Napa 500 mg x 10",
    "pharmacy": "Lazz Pharma",
    "quantity": 10,
    "totalPrice": 12,
    "pickupAt": "2026-11-06T12:00:00.000Z",
    "status": "Collected",
    "statusLabel": "Collected",
    "consumedBatches": [
      {
        "batch": "6aeb8dd8d346b37c89b2a16e",
        "batchNumber": "NP-2411",
        "quantity": 10
      }
    ],
    "remainingStock": 330,
    "nextStatus": null
  }
}
```

#### M2-F2-N1 - Invalid status transition (409) (error case)

A Collected reservation cannot move back to Confirmed.

- **Request:** `PATCH http://127.0.0.1:9050/api/owner/reservations/{{reservationId}}/status`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 409

```json
{
  "status": "Confirmed"
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Reservation is Collected; no further status changes are allowed"
}
```

#### M2-F2-N2 - Cancel after Ready for pickup / collected (409) (error case)

Cancellation is only allowed before Ready for pickup.

- **Request:** `PATCH http://127.0.0.1:9050/api/reservations/{{reservationId}}/cancel`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 409

```json
{}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Cannot cancel a reservation that is Collected. Cancellation is allowed only before Ready for pickup."
}
```

#### M2-F2-06 - Reservation status timeline

Reservation detail with the 4-step timeline (Pending, Confirmed, Ready for pickup, Collected), full status history, pickup deadline and whether it can be cancelled.

- **Request:** `GET http://127.0.0.1:9050/api/reservations/{{reservationId}}`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation details",
  "data": {
    "id": "6aeb8dde98cb47d48631c371",
    "code": "R-1019",
    "medicine": "Napa 500 mg x 10",
    "pharmacy": "Lazz Pharma",
    "quantity": 10,
    "totalPrice": 12,
    "pickupAt": "2026-11-06T12:00:00.000Z",
    "status": "Collected",
    "statusLabel": "Collected",
    "medicineDetails": {
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "strength": "500 mg",
      "dosageForm": "Tablet",
      "manufacturer": "Beximco Pharmaceuticals",
      "requiresPrescription": false
    },
    "unitPrice": 1.2,
    "pickupDeadline": "2026-11-06T14:00:00.000Z",
    "note": "I need the 500 mg strip only",
    "prescriptionUrl": "/uploads/prescriptions/1793822174218-7f214214af6e.png",
    "prescriptionRequired": false,
    "timeline": {
      "steps": [
        {
          "status": "Pending",
  ...
```

#### M2-F2-N3 - Another patient cannot view the reservation (403) (error case)

Reservation details are visible only to the patient, the pharmacy owner and admins.

- **Request:** `GET http://127.0.0.1:9050/api/reservations/{{reservationId}}`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 403

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "You cannot view this reservation"
}
```

#### M2-F2-07 - Reject reservation with reason

Owner rejects a Pending/Confirmed request with a reason and optional message; the patient is notified by email and in the app.

- **Request:** `PATCH http://127.0.0.1:9050/api/owner/reservations/{{rejectReservationId}}/reject`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "reason": "Out of stock",
  "message": "Sorry, this batch is sold out. New stock arrives on Thursday."
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation rejected",
  "data": {
    "id": "6aeb8ddad346b37c89b2a26a",
    "code": "R-1012",
    "medicine": "Seclo 20 20 mg x 4",
    "pharmacy": "Lazz Pharma",
    "quantity": 4,
    "totalPrice": 24,
    "pickupAt": "2026-11-06T11:00:00.000Z",
    "status": "Rejected",
    "statusLabel": "Rejected",
    "rejection": {
      "reason": "Out of stock",
      "message": "Sorry, this batch is sold out. New stock arrives on Thursday."
    }
  }
}
```

#### M2-F2-08 - Patient cancels reservation

Patients can cancel any time before the reservation is Ready for pickup.

- **Request:** `PATCH http://127.0.0.1:9050/api/reservations/{{cancelReservationId}}/cancel`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 200

```json
{
  "reason": "Bought it elsewhere"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservation cancelled",
  "data": {
    "id": "6aeb8ddad346b37c89b2a267",
    "code": "R-1011",
    "medicine": "Napa 500 mg x 10",
    "pharmacy": "Lazz Pharma",
    "quantity": 10,
    "totalPrice": 12,
    "pickupAt": "2026-11-06T12:00:00.000Z",
    "status": "Cancelled",
    "statusLabel": "Cancelled"
  }
}
```

#### M2-F2-09 - Expire overdue reservations (scheduled job trigger)

Runs the same logic as the node-cron job (every 5 minutes): active reservations whose pickup deadline has passed become Expired and patients are notified.

- **Request:** `POST http://127.0.0.1:9050/api/admin/reservations/expire-overdue`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Overdue reservations expired",
  "data": {
    "expiredCount": 1,
    "codes": [
      "R-1018"
    ]
  }
}
```

#### M2-F2-N4 - Non-admin cannot run the expiry job (403) (error case)

Admin-only action.

- **Request:** `POST http://127.0.0.1:9050/api/admin/reservations/expire-overdue`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 403

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "This action requires role: admin"
}
```

---

## Member 3 - Abdullah Al Muqit (22201783) - port 1783

### Feature 01: Medicine Search & Filter

Route file: `backend/src/routes/search.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/search/suggestions` | Public | suggestions |
| GET | `/api/search/medicines` | Public | searchMedicines |
| GET | `/api/search/filters` | Public | filterOptions |
| GET | `/api/search/popular` | Public | popular |

#### M3-F1-01 - Partial-match suggestions

Suggestions while typing: matching generic names (with brand counts) and brand names with manufacturer, form and strength.

- **Request:** `GET http://127.0.0.1:1783/api/search/suggestions`
- **Query:** `q=para`, `limit=8`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Suggestions",
  "data": {
    "query": "para",
    "suggestions": [
      {
        "type": "Generic",
        "name": "Paracetamol",
        "subtitle": "7 brands"
      },
      {
        "type": "Generic",
        "name": "Paracetamol + Caffeine",
        "subtitle": "2 brands"
      }
    ]
  }
}
```

#### M3-F1-02 - Search medicines by brand or generic name

Search results with per-unit price range and how many verified pharmacies list each medicine; paginated and sortable.

- **Request:** `GET http://127.0.0.1:1783/api/search/medicines`
- **Query:** `q=paracetamol`, `page=1`, `limit=10`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "query": "paracetamol",
    "appliedFilters": {
      "inStock": false
    },
    "total": 9,
    "results": [
      {
        "id": "3bec8373567f1e169fbef9cb",
        "brandName": "Napa",
        "genericName": "Paracetamol",
        "manufacturer": "Beximco Pharmaceuticals",
        "dosageForm": "Tablet",
        "strength": "500 mg",
        "unit": "pc",
        "requiresPrescription": false,
        "priceRange": {
          "min": 1,
          "max": 1.5
        },
        "pharmacyCount": 5,
        "inStockPharmacyCount": 5
      },
      {
        "id": "be56a4bd6dcd067d5a7dcfd1",
        "brandName": "Ace",
        "genericName": "Paracetamol",
  ...
```

#### M3-F1-03 - Search with filters

Filter by dosage form, strength, manufacturer, price range and "in stock only"; sort by lowest price.

- **Request:** `GET http://127.0.0.1:1783/api/search/medicines`
- **Query:** `q=paracetamol`, `dosageForm=Tablet`, `strength=500 mg`, `manufacturer=Beximco Pharmaceuticals,Square Pharmaceuticals`, `minPrice=1`, `maxPrice=5`, `inStock=true`, `sort=price_asc`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "query": "paracetamol",
    "appliedFilters": {
      "dosageForm": [
        "Tablet"
      ],
      "strength": [
        "500 mg"
      ],
      "manufacturer": [
        "Beximco Pharmaceuticals",
        "Square Pharmaceuticals"
      ],
      "minPrice": 1,
      "maxPrice": 5,
      "inStock": true
    },
    "total": 2,
    "results": [
      {
        "id": "3bec8373567f1e169fbef9cb",
        "brandName": "Napa",
        "genericName": "Paracetamol",
        "manufacturer": "Beximco Pharmaceuticals",
        "dosageForm": "Tablet",
        "strength": "500 mg",
        "unit": "pc",
  ...
```

#### M3-F1-04 - Filter options with counts

Values and counts for the filter sidebar (dosage forms, strengths, manufacturers) and the price range for the current query.

- **Request:** `GET http://127.0.0.1:1783/api/search/filters`
- **Query:** `q=paracetamol`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Filter options",
  "data": {
    "query": "paracetamol",
    "dosageForms": [
      {
        "value": "Tablet",
        "count": 7
      },
      {
        "value": "Syrup",
        "count": 2
      }
    ],
    "strengths": [
      {
        "value": "120 mg/5 ml",
        "count": 2
      },
      {
        "value": "250 mg",
        "count": 1
      },
      {
        "value": "500 mg",
        "count": 3
      },
      {
        "value": "500 mg + 65 mg",
  ...
```

#### M3-F1-05 - Popular searches

Popular search chips, from the search log (falls back to the most widely listed medicines).

- **Request:** `GET http://127.0.0.1:1783/api/search/popular`
- **Query:** `limit=6`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Popular searches",
  "data": {
    "source": "search-log",
    "popular": [
      {
        "term": "Napa",
        "searches": 42
      },
      {
        "term": "Seclo 20",
        "searches": 25
      },
      {
        "term": "Fexo 120",
        "searches": 19
      },
      {
        "term": "Monas 10",
        "searches": 15
      },
      {
        "term": "Ostocal",
        "searches": 9
      },
      {
        "term": "Orsaline",
        "searches": 7
      }
  ...
```

#### M3-F1-06 - No results found

Misspelled query returns an empty list with guidance (No Results Found screen).

- **Request:** `GET http://127.0.0.1:1783/api/search/medicines`
- **Query:** `q=paracetamool`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "query": "paracetamool",
    "appliedFilters": {
      "inStock": false
    },
    "total": 0,
    "results": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 1
    },
    "message": "No medicines found for \"paracetamool\". Check the spelling or try a generic name. You can also clear some filters.",
    "disclaimer": "Availability and prices are reported by pharmacies. Please confirm with the pharmacy before travelling. MedFind BD does not give medical advice."
  }
}
```

#### M3-F1-N1 - Invalid price range (400) (error case)

minPrice greater than maxPrice is rejected.

- **Request:** `GET http://127.0.0.1:1783/api/search/medicines`
- **Query:** `q=napa`, `minPrice=50`, `maxPrice=10`
- **Auth:** none
- **Expected status:** 400

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "minPrice",
      "message": "minPrice cannot be greater than maxPrice"
    }
  ]
}
```

#### M3-F1-N2 - Suggestion query too short (400) (error case)

At least 2 characters are needed for suggestions.

- **Request:** `GET http://127.0.0.1:1783/api/search/suggestions`
- **Query:** `q=p`
- **Auth:** none
- **Expected status:** 400

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "q",
      "message": "q must have at least 2 characters"
    }
  ]
}
```

### Feature 02: Nearby Pharmacies & Sorting

Route file: `backend/src/routes/nearby.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| GET | `/api/locations/areas` | Public | areas |
| GET | `/api/locations/resolve` | Public | resolve |
| GET | `/api/nearby/pharmacies` | Public | nearby |
| GET | `/api/nearby/pharmacies/:pharmacyId` | Public | pharmacySummary |

#### M3-F2-01 - Selectable areas (Choose location)

City > area list for "Select an area" and the radius options (1, 3, 5, 10, 20 km).

- **Request:** `GET http://127.0.0.1:1783/api/locations/areas`
- **Query:** `city=Dhaka`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Areas",
  "data": {
    "cities": [
      {
        "name": "Dhaka",
        "areas": [
          {
            "id": "204db801456838bb0df33e24",
            "name": "Banani",
            "lat": 23.7937,
            "lng": 90.4066
          },
          {
            "id": "375762db6a967fe743a653b7",
            "name": "Dhanmondi",
            "lat": 23.7461,
            "lng": 90.3742
          },
          {
            "id": "f45ff18fe9c40a21d1089849",
            "name": "Gulshan",
            "lat": 23.7925,
            "lng": 90.4078
          },
          {
            "id": "c5912ba62e58f6125db0e3fa",
            "name": "Mirpur 1",
            "lat": 23.7957,
  ...
```

#### M3-F2-02 - Use my location (resolve coordinates)

Turns shared GPS coordinates into the nearest area label (e.g. "Mirpur 10, Dhaka").

- **Request:** `GET http://127.0.0.1:1783/api/locations/resolve`
- **Query:** `lat=23.8069`, `lng=90.3687`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Location resolved",
  "data": {
    "lat": 23.8069,
    "lng": 90.3687,
    "area": {
      "id": "6eb7024f30ececf8f51c3e21",
      "name": "Mirpur 10",
      "city": "Dhaka",
      "label": "Mirpur 10, Dhaka"
    },
    "label": "Mirpur 10, Dhaka",
    "privacy": "Your exact location is only used to calculate distance and is not shared with pharmacies."
  }
}
```

#### M3-F2-03 - Nearby pharmacies stocking a medicine (sort by distance)

Verified pharmacies within the radius that stock the searched medicine, using a MongoDB 2dsphere $geoNear query, nearest first.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`, `lat=23.8069`, `lng=90.3687`, `radiusKm=5`, `sort=distance`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Nearby pharmacies",
  "data": {
    "location": {
      "label": "23.8069, 90.3687",
      "lat": 23.8069,
      "lng": 90.3687
    },
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "label": "Napa 500 mg",
      "genericName": "Paracetamol"
    },
    "radiusKm": 5,
    "sort": "distance",
    "openNow": false,
    "total": 4,
    "summary": "4 pharmacies within 5 km that stock Napa 500 mg",
    "pharmacies": [
      {
        "id": "0367672641e1463cf4ee98cd",
        "name": "Lazz Pharma",
        "address": "House 12, Road 3, Mirpur 10, Dhaka",
        "area": "Mirpur 10",
        "verified": true,
        "openNow": false,
        "openingHours": "Daily 9:00 AM - 10:00 PM",
        "rating": 4.8,
        "ratingCount": 5,
  ...
```

#### M3-F2-04 - Nearby pharmacies by selected area, sorted by price

Same search starting from a selected area instead of GPS, cheapest first.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`, `areaId=6eb7024f30ececf8f51c3e21`, `radiusKm=5`, `sort=price`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Nearby pharmacies",
  "data": {
    "location": {
      "label": "Mirpur 10, Dhaka",
      "lat": 23.8069,
      "lng": 90.3687
    },
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "label": "Napa 500 mg",
      "genericName": "Paracetamol"
    },
    "radiusKm": 5,
    "sort": "price",
    "openNow": false,
    "total": 4,
    "summary": "4 pharmacies within 5 km that stock Napa 500 mg",
    "pharmacies": [
      {
        "id": "762db1f8dd93e1a8c9999f02",
        "name": "Tamanna Pharmacy",
        "address": "Plot 5, Section 1 Main Road, Mirpur 1, Dhaka",
        "area": "Mirpur 1",
        "verified": true,
        "openNow": false,
        "openingHours": "Daily 8:00 AM - 11:00 PM",
        "rating": 4,
        "ratingCount": 1,
  ...
```

#### M3-F2-05 - Sort by rating

Highest-rated pharmacies first.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`, `lat=23.8069`, `lng=90.3687`, `radiusKm=10`, `sort=rating`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Nearby pharmacies",
  "data": {
    "location": {
      "label": "23.8069, 90.3687",
      "lat": 23.8069,
      "lng": 90.3687
    },
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "label": "Napa 500 mg",
      "genericName": "Paracetamol"
    },
    "radiusKm": 10,
    "sort": "rating",
    "openNow": false,
    "total": 5,
    "summary": "5 pharmacies within 10 km that stock Napa 500 mg",
    "pharmacies": [
      {
        "id": "0367672641e1463cf4ee98cd",
        "name": "Lazz Pharma",
        "address": "House 12, Road 3, Mirpur 10, Dhaka",
        "area": "Mirpur 10",
        "verified": true,
        "openNow": false,
        "openingHours": "Daily 9:00 AM - 10:00 PM",
        "rating": 4.8,
        "ratingCount": 5,
  ...
```

#### M3-F2-06 - Open now + most recently updated stock

Only pharmacies open at this moment (Asia/Dhaka time), sorted by the latest stock update.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`, `lat=23.8069`, `lng=90.3687`, `radiusKm=10`, `sort=updated`, `openNow=true`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Nearby pharmacies",
  "data": {
    "location": {
      "label": "23.8069, 90.3687",
      "lat": 23.8069,
      "lng": 90.3687
    },
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "label": "Napa 500 mg",
      "genericName": "Paracetamol"
    },
    "radiusKm": 10,
    "sort": "updated",
    "openNow": true,
    "total": 1,
    "summary": "1 pharmacy within 10 km that stock Napa 500 mg",
    "pharmacies": [
      {
        "id": "e9a8e974b7602290887787a9",
        "name": "Green Life Pharmacy",
        "address": "House 40, Avenue 5, Mirpur 11, Dhaka",
        "area": "Mirpur 11",
        "verified": true,
        "openNow": true,
        "openingHours": "Open 24 hours",
        "rating": 4.5,
        "ratingCount": 2,
  ...
```

#### M3-F2-07 - No pharmacies nearby

Empty state suggests a bigger radius or turning off "Open now".

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`, `lat=22.326`, `lng=91.812`, `radiusKm=5`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Nearby pharmacies",
  "data": {
    "location": {
      "label": "22.3260, 91.8120",
      "lat": 22.326,
      "lng": 91.812
    },
    "medicine": {
      "id": "3bec8373567f1e169fbef9cb",
      "label": "Napa 500 mg",
      "genericName": "Paracetamol"
    },
    "radiusKm": 5,
    "sort": "distance",
    "openNow": false,
    "total": 0,
    "summary": "0 pharmacies within 5 km that stock Napa 500 mg",
    "pharmacies": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 1
    },
    "emptyState": {
      "message": "No pharmacies within 5 km stock Napa 500 mg",
      "suggestions": {
        "largerRadiusKm": [
  ...
```

#### M3-F2-08 - Pharmacy summary (map marker / details)

One pharmacy's summary with distance from the user, stock of the searched medicine and a directions link.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies/0367672641e1463cf4ee98cd`
- **Query:** `lat=23.8069`, `lng=90.3687`, `medicineId=3bec8373567f1e169fbef9cb`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy summary",
  "data": {
    "id": "0367672641e1463cf4ee98cd",
    "name": "Lazz Pharma",
    "address": "House 12, Road 3, Mirpur 10, Dhaka",
    "area": "Mirpur 10",
    "verified": true,
    "openNow": false,
    "openingHours": "Daily 9:00 AM - 10:00 PM",
    "rating": 4.8,
    "ratingCount": 5,
    "distanceKm": 0.1,
    "location": {
      "lat": 23.8075,
      "lng": 90.368
    },
    "phone": "01712345678",
    "directionsUrl": "https://www.google.com/maps/dir/?api=1&destination=23.8075,90.368",
    "listing": {
      "medicine": "Napa 500 mg",
      "price": 1.2,
      "stock": 340,
      "stockStatus": "In stock",
      "lastUpdatedAt": "2026-11-04T17:56:16.432Z"
    }
  }
}
```

#### M3-F2-N1 - Missing location (400) (error case)

Either lat & lng or an areaId is required.

- **Request:** `GET http://127.0.0.1:1783/api/nearby/pharmacies`
- **Query:** `medicineId=3bec8373567f1e169fbef9cb`
- **Auth:** none
- **Expected status:** 400

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "lat",
      "message": "Provide lat and lng, or areaId"
    }
  ]
}
```

---

## Member 4 - Md Didarul Islam Nayan (23301274) - port 1274

### Feature 01: Pharmacy Verification & Reviews

Route file: `backend/src/routes/verification.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| POST | `/api/pharmacies/register` | Owner | registerPharmacy (multipart upload) |
| GET | `/api/pharmacies/mine/verification` | Owner | myVerification |
| PUT | `/api/pharmacies/mine/licence` | Owner | resubmitLicence (multipart upload) |
| GET | `/api/admin/pharmacies` | Admin | adminList |
| GET | `/api/admin/pharmacies/:id` | Admin | adminDetail |
| PATCH | `/api/admin/pharmacies/:id/verification` | Admin | decide |
| GET | `/api/pharmacies/:id` | Public | publicProfile |
| GET | `/api/pharmacies/:id/reviews` | Public | listReviews |
| GET | `/api/pharmacies/:id/reviewable-reservations` | Patient | reviewableReservations |
| POST | `/api/pharmacies/:id/reviews` | Patient | createReview |

#### M4-F1-01 - Register pharmacy with licence details

Pharmacy owner submits pharmacy details, map location (lat/lng), opening hours and trade / drug licence numbers. Verification starts as Pending and admins are notified. (The endpoint also accepts multipart/form-data with an optional licenceDocument image; the image upload is shown in API 7.)

- **Request:** `POST http://127.0.0.1:1274/api/pharmacies/register`
- **Auth:** Bearer token (newOwnerToken)
- **Expected status:** 201

```json
{
  "name": "Nadia Drug House",
  "phone": "01720123456",
  "email": "nadia.pharmacy@example.com",
  "addressLine": "House 8, Road 11",
  "area": "Banani",
  "city": "Dhaka",
  "lat": 23.794,
  "lng": 90.405,
  "openingHours": [
    {
      "day": 0,
      "open": "09:00",
      "close": "22:00"
    },
    {
      "day": 1,
      "open": "09:00",
      "close": "22:00"
    },
    {
      "day": 2,
      "open": "09:00",
      "close": "22:00"
    },
    {
      "day": 3,
      "open": "09:00",
      "close": "22:00"
    },
    {
      "day": 4,
      "open": "09:00",
      "close": "22:00"
    },
    {
      "day": 6,
      "open": "09:00",
      "close": "22:00"
    }
  ],
  "openingHoursText": "Sat-Thu 9:00 AM - 10:00 PM",
  "tradeLicenceNo": "TRD-2026-777001",
  "drugLicenceNo": "DL-DHK-77701"
}
```

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy registered; verification is Pending",
  "data": {
    "pharmacyId": "6aeb92235d3cdae6a0e944d8",
    "name": "Nadia Drug House",
    "status": "Pending",
    "verifiedBadge": false,
    "visibleInSearch": false,
    "isSuspended": false,
    "note": null,
    "checklist": {
      "tradeLicenceMatches": false,
      "drugLicenceValid": false,
      "contactComplete": false,
      "noDuplicate": false
    },
    "licence": {
      "tradeLicenceNo": "TRD-2026-777001",
      "drugLicenceNo": "DL-DHK-77701",
      "submittedAt": "2026-11-04T20:14:27.298Z"
    },
    "reviewedAt": null,
    "history": [
      {
        "status": "Pending",
        "note": "Registration submitted",
        "by": "7392a0fe886119e705bb4263",
        "at": "2026-11-04T20:14:27.299Z"
      }
  ...
```

#### M4-F1-02 - Owner checks verification status

Owner sees Pending / Verified / Rejected, the admin note, checklist and history.

- **Request:** `GET http://127.0.0.1:1274/api/pharmacies/mine/verification`
- **Auth:** Bearer token (newOwnerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Verification status",
  "data": {
    "pharmacyId": "6aeb92235d3cdae6a0e944d8",
    "name": "Nadia Drug House",
    "status": "Pending",
    "verifiedBadge": false,
    "visibleInSearch": false,
    "isSuspended": false,
    "note": null,
    "checklist": {
      "tradeLicenceMatches": false,
      "drugLicenceValid": false,
      "contactComplete": false,
      "noDuplicate": false
    },
    "licence": {
      "tradeLicenceNo": "TRD-2026-777001",
      "drugLicenceNo": "DL-DHK-77701",
      "submittedAt": "2026-11-04T20:14:27.298Z"
    },
    "reviewedAt": null,
    "history": [
      {
        "status": "Pending",
        "note": "Registration submitted",
        "by": "7392a0fe886119e705bb4263",
        "at": "2026-11-04T20:14:27.299Z"
      }
  ...
```

#### M4-F1-03 - Admin: pharmacies pending verification

Admin list filtered by status with counts (Pending, Verified, Rejected, Suspended).

- **Request:** `GET http://127.0.0.1:1274/api/admin/pharmacies`
- **Query:** `status=Pending`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacies",
  "data": {
    "counts": {
      "pending": 3,
      "verified": 5,
      "rejected": 1,
      "suspended": 0
    },
    "pharmacies": [
      {
        "id": "24157e5f946b95812b4b9b3d",
        "name": "Shapla Pharmacy",
        "area": "Uttara, Dhaka",
        "owner": "Farhana Akter",
        "tradeLicenceNo": "TRD-2026-011122",
        "drugLicenceNo": "DL-DHK-60117",
        "status": "Pending",
        "isSuspended": false,
        "submittedAt": "2026-11-02T20:14:20.527Z"
      },
      {
        "id": "f6289c77bd8917169b0eece6",
        "name": "Dhanmondi Health Pharmacy",
        "area": "Dhanmondi, Dhaka",
        "owner": "Mahmud Hasan",
        "tradeLicenceNo": "TRD-2026-013344",
        "drugLicenceNo": "DL-DHK-60342",
        "status": "Pending",
  ...
```

#### M4-F1-04 - Admin: review submitted licence details

Submitted details, licence document, checklist and automated checks (contact complete, possible duplicates).

- **Request:** `GET http://127.0.0.1:1274/api/admin/pharmacies/{{newPharmacyId}}`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy verification details",
  "data": {
    "id": "6aeb92235d3cdae6a0e944d8",
    "name": "Nadia Drug House",
    "status": "Pending",
    "submitted": {
      "owner": "Nadia Rahman",
      "phone": "01720123456",
      "email": "nadia.pharmacy@example.com",
      "tradeLicenceNo": "TRD-2026-777001",
      "drugLicenceNo": "DL-DHK-77701",
      "licenceDocumentUrl": null,
      "address": "House 8, Road 11, Banani, Dhaka",
      "openingHours": "Sat-Thu 9:00 AM - 10:00 PM",
      "location": {
        "lat": 23.794,
        "lng": 90.405
      },
      "submittedAt": "2026-11-04T20:14:27.298Z"
    },
    "checklist": {
      "tradeLicenceMatches": false,
      "drugLicenceValid": false,
      "contactComplete": false,
      "noDuplicate": false
    },
    "automatedChecks": {
      "contactComplete": true,
  ...
```

#### M4-F1-05 - Admin: verify pharmacy

Mark as Verified after every checklist item is confirmed. The pharmacy gets the Verified badge and appears in search.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/{{newPharmacyId}}/verification`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "status": "Verified",
  "note": "Trade and drug licence verified with DGDA records",
  "checklist": {
    "tradeLicenceMatches": true,
    "drugLicenceValid": true,
    "contactComplete": true,
    "noDuplicate": true
  }
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Verification decision saved",
  "data": {
    "pharmacyId": "6aeb92235d3cdae6a0e944d8",
    "name": "Nadia Drug House",
    "status": "Verified",
    "verifiedBadge": true,
    "visibleInSearch": true,
    "isSuspended": false,
    "note": "Trade and drug licence verified with DGDA records",
    "checklist": {
      "tradeLicenceMatches": true,
      "drugLicenceValid": true,
      "contactComplete": true,
      "noDuplicate": true
    },
    "licence": {
      "tradeLicenceNo": "TRD-2026-777001",
      "drugLicenceNo": "DL-DHK-77701",
      "submittedAt": "2026-11-04T20:14:27.298Z"
    },
    "reviewedAt": "2026-11-04T20:14:27.668Z",
    "history": [
      {
        "status": "Pending",
        "note": "Registration submitted",
        "by": "7392a0fe886119e705bb4263",
        "at": "2026-11-04T20:14:27.299Z"
      },
  ...
```

#### M4-F1-06 - Admin: reject pharmacy with note

Rejection requires a note to the owner.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/24157e5f946b95812b4b9b3d/verification`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "status": "Rejected",
  "note": "Drug licence number could not be found in DGDA records",
  "checklist": {
    "tradeLicenceMatches": true,
    "drugLicenceValid": false
  }
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Verification decision saved",
  "data": {
    "pharmacyId": "24157e5f946b95812b4b9b3d",
    "name": "Shapla Pharmacy",
    "status": "Rejected",
    "verifiedBadge": false,
    "visibleInSearch": false,
    "isSuspended": false,
    "note": "Drug licence number could not be found in DGDA records",
    "checklist": {
      "tradeLicenceMatches": true,
      "drugLicenceValid": false,
      "contactComplete": false,
      "noDuplicate": false
    },
    "licence": {
      "tradeLicenceNo": "TRD-2026-011122",
      "drugLicenceNo": "DL-DHK-60117",
      "submittedAt": "2026-11-02T20:14:20.527Z"
    },
    "reviewedAt": "2026-11-04T20:14:27.780Z",
    "history": [
      {
        "status": "Pending",
        "note": "Registration submitted",
        "at": "2026-11-02T20:14:20.527Z"
      },
      {
  ...
```

#### M4-F1-N1 - Verify without completing the checklist (400) (error case)

All four checklist items must be confirmed.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/f6289c77bd8917169b0eece6/verification`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 400

```json
{
  "status": "Verified"
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "All checklist items must be confirmed before verifying. Missing: tradeLicenceMatches, drugLicenceValid, contactComplete, noDuplicate"
}
```

#### M4-F1-07 - Owner resubmits licence (with licence document image)

A rejected owner submits corrected licence numbers and a licence document image (PNG/JPG up to 5 MB, stored in Cloudinary or local uploads); verification returns to Pending.

- **Request:** `PUT http://127.0.0.1:1274/api/pharmacies/mine/licence`
- **Auth:** Bearer token (rejectedOwnerToken)
- **Expected status:** 200

multipart/form-data: `tradeLicenceNo`, `drugLicenceNo`, `licenceDocument` (file)

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Licence resubmitted; verification is Pending",
  "data": {
    "pharmacyId": "f56353dddac0b6dcf7c5591d",
    "name": "Medicare Point",
    "status": "Pending",
    "verifiedBadge": false,
    "visibleInSearch": false,
    "isSuspended": false,
    "note": null,
    "checklist": {},
    "licence": {
      "tradeLicenceNo": "TRD-2026-019900",
      "drugLicenceNo": "DL-DHK-61000",
      "submittedAt": "2026-11-04T20:14:27.991Z",
      "documentUrl": "/uploads/licences/1793823267990-701528e24224.png"
    },
    "reviewedAt": "2026-10-30T20:14:20.527Z",
    "history": [
      {
        "status": "Pending",
        "note": "Registration submitted",
        "at": "2026-10-28T20:14:20.527Z"
      },
      {
        "status": "Rejected",
        "note": "Drug licence number does not match DGDA records",
        "by": "fa42c94a49ce2fbf483a219d",
        "at": "2026-10-30T20:14:20.527Z"
  ...
```

#### M4-F1-08 - Public pharmacy profile with rating summary

Verified badge, open-now, address, hours, average rating and 5-star distribution.

- **Request:** `GET http://127.0.0.1:1274/api/pharmacies/0367672641e1463cf4ee98cd`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy profile",
  "data": {
    "id": "0367672641e1463cf4ee98cd",
    "name": "Lazz Pharma",
    "verifiedBadge": true,
    "openNow": false,
    "address": "House 12, Road 3, Mirpur 10, Dhaka",
    "openingHours": "Daily 9:00 AM - 10:00 PM",
    "phone": "01712345678",
    "location": {
      "lat": 23.8075,
      "lng": 90.368
    },
    "rating": {
      "average": 4.8,
      "count": 5,
      "distribution": [
        {
          "stars": 5,
          "count": 4,
          "percent": 80
        },
        {
          "stars": 4,
          "count": 1,
          "percent": 20
        },
        {
  ...
```

#### M4-F1-N2 - Unverified pharmacy hidden from public (404) (error case)

Pending/Rejected pharmacies have no public profile.

- **Request:** `GET http://127.0.0.1:1274/api/pharmacies/f6289c77bd8917169b0eece6`
- **Auth:** none
- **Expected status:** 404

Response (404, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Pharmacy not found or not verified"
}
```

#### M4-F1-09 - Pharmacy reviews

Reviews, most recent first, marked as verified purchases.

- **Request:** `GET http://127.0.0.1:1274/api/pharmacies/0367672641e1463cf4ee98cd/reviews`
- **Query:** `page=1`, `limit=5`
- **Auth:** none
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reviews",
  "data": {
    "pharmacy": {
      "id": "0367672641e1463cf4ee98cd",
      "name": "Lazz Pharma",
      "ratingAverage": 4.8,
      "ratingCount": 5
    },
    "reviews": [
      {
        "id": "6aeb921f0f523725a4aad768",
        "author": "Ayesha S.",
        "rating": 5,
        "text": "Had the medicine in stock exactly as listed. Quick and polite.",
        "verifiedPurchase": true,
        "createdAt": "2026-11-02T20:14:20.527Z"
      },
      {
        "id": "6aeb921f0f523725a4aad76a",
        "author": "Imran H.",
        "rating": 4,
        "text": "Good price. Waited 10 minutes at pickup.",
        "verifiedPurchase": true,
        "createdAt": "2026-10-28T20:14:20.527Z"
      },
      {
        "id": "6aeb921f0f523725a4aad76c",
        "author": "Sadia I.",
  ...
```

#### M4-F1-10 - Reservations eligible for review

The patient's collected, not-yet-reviewed reservations at this pharmacy (Reservation dropdown on "Write a review").

- **Request:** `GET http://127.0.0.1:1274/api/pharmacies/0367672641e1463cf4ee98cd/reviewable-reservations`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Reservations you can review",
  "data": {
    "reservations": [
      {
        "id": "6aeb921f0f523725a4aad732",
        "code": "R-1001",
        "label": "#R-1001 Monas 10 x 30 (Collected)",
        "collectedAt": "2026-10-20T12:00:00.000Z"
      }
    ]
  }
}
```

#### M4-F1-11 - Write a review (1-5 stars)

Only a patient with a collected reservation can rate the pharmacy; the average rating is recalculated in the same transaction.

- **Request:** `POST http://127.0.0.1:1274/api/pharmacies/0367672641e1463cf4ee98cd/reviews`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 201

```json
{
  "reservationId": "{{reviewReservationId}}",
  "rating": 4,
  "text": "Stock was exactly as listed and the staff were helpful."
}
```

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Review submitted",
  "data": {
    "review": {
      "id": "6aeb92245d3cdae6a0e9450a",
      "rating": 4,
      "text": "Stock was exactly as listed and the staff were helpful.",
      "reservation": "R-1001",
      "createdAt": "2026-11-04T20:14:28.470Z"
    },
    "pharmacyRating": {
      "ratingAverage": 4.67,
      "ratingCount": 6
    }
  }
}
```

#### M4-F1-N3 - Duplicate review (409) (error case)

One review per collected reservation.

- **Request:** `POST http://127.0.0.1:1274/api/pharmacies/0367672641e1463cf4ee98cd/reviews`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 409

```json
{
  "reservationId": "{{reviewReservationId}}",
  "rating": 5
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "You have already reviewed this reservation"
}
```

#### M4-F1-N4 - Owner cannot use admin verification (403) (error case)

Admin-only action.

- **Request:** `GET http://127.0.0.1:1274/api/admin/pharmacies`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 403

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "This action requires role: admin"
}
```

### Feature 02: Complaints & Disputes

Route file: `backend/src/routes/complaint.routes.js`

| Method | Endpoint | Access | Handler |
|---|---|---|---|
| POST | `/api/complaints` | Patient | fileComplaint (multipart upload) |
| GET | `/api/complaints/my` | Patient | myComplaints |
| GET | `/api/complaints/:id` | Any logged-in user (ownership checked) | getComplaint |
| GET | `/api/owner/complaints` | Owner | ownerComplaints |
| PATCH | `/api/owner/complaints/:id/response` | Owner | respond |
| GET | `/api/admin/complaints` | Admin | adminComplaints |
| PATCH | `/api/admin/complaints/:id/status` | Admin | updateStatus |
| PATCH | `/api/admin/pharmacies/:id/suspend` | Admin | suspend |
| PATCH | `/api/admin/pharmacies/:id/reinstate` | Admin | reinstate |

#### M4-F2-01 - File a complaint about a reservation

Patient files a complaint about a specific reservation (or a pharmacy) with issue type, description and evidence images. Status starts as Open and the owner is notified.

- **Request:** `POST http://127.0.0.1:1274/api/complaints`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 201

multipart/form-data: `targetType`, `reservationId`, `issueType`, `description`, `evidence` (file)

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaint submitted",
  "data": {
    "id": "6aeb92245d3cdae6a0e94519",
    "code": "C-207",
    "issueType": "Overcharging",
    "pharmacy": "Lazz Pharma",
    "reservation": "R-1001",
    "status": "Open",
    "statusLabel": "Open",
    "latestUpdate": "Waiting for the pharmacy to respond.",
    "createdAt": "2026-11-04T20:14:28.771Z",
    "targetType": "reservation",
    "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
    "evidence": [
      "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
    ],
    "pharmacyResponse": null,
    "resolutionNote": null,
    "history": [
      {
        "action": "filed",
        "status": "Open",
        "statusLabel": "Open",
        "note": "Overcharging",
        "at": "2026-11-04T20:14:28.771Z"
      }
    ]
  }
  ...
```

#### M4-F2-02 - File a complaint about a pharmacy

Complaint against a pharmacy without a specific reservation.

- **Request:** `POST http://127.0.0.1:1274/api/complaints`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 201

```json
{
  "targetType": "pharmacy",
  "pharmacyId": "e9a8e974b7602290887787a9",
  "issueType": "Medicine listed but unavailable",
  "description": "Napa Syrup was listed in stock but the pharmacy said it was sold out."
}
```

Response (201, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaint submitted",
  "data": {
    "id": "6aeb92245d3cdae6a0e94524",
    "code": "C-208",
    "issueType": "Medicine listed but unavailable",
    "pharmacy": "Green Life Pharmacy",
    "reservation": null,
    "status": "Open",
    "statusLabel": "Open",
    "latestUpdate": "Waiting for the pharmacy to respond.",
    "createdAt": "2026-11-04T20:14:28.884Z",
    "targetType": "pharmacy",
    "description": "Napa Syrup was listed in stock but the pharmacy said it was sold out.",
    "evidence": [],
    "pharmacyResponse": null,
    "resolutionNote": null,
    "history": [
      {
        "action": "filed",
        "status": "Open",
        "statusLabel": "Open",
        "note": "Medicine listed but unavailable",
        "at": "2026-11-04T20:14:28.884Z"
      }
    ]
  }
}
```

#### M4-F2-N1 - Invalid complaint (400) (error case)

Unknown issue type, short description and missing pharmacyId are rejected.

- **Request:** `POST http://127.0.0.1:1274/api/complaints`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 400

```json
{
  "targetType": "pharmacy",
  "issueType": "Bad service",
  "description": "bad"
}
```

Response (400, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "issueType",
      "message": "issueType must be one of: Medicine listed but unavailable, Overcharging, Rude behaviour, Reservation not honoured, Expired or damaged medicine, Other"
    },
    {
      "field": "description",
      "message": "description must have at least 10 characters"
    }
  ]
}
```

#### M4-F2-N2 - Complaint on someone else's reservation (403) (error case)

Patients can only complain about their own reservations.

- **Request:** `POST http://127.0.0.1:1274/api/complaints`
- **Auth:** Bearer token (patient2Token)
- **Expected status:** 403

```json
{
  "targetType": "reservation",
  "reservationId": "{{reviewReservationId}}",
  "issueType": "Overcharging",
  "description": "This is not my reservation at all."
}
```

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "You can only complain about your own reservations"
}
```

#### M4-F2-03 - My complaints

Patient's complaints with tab counts (All / Open / Under review / Closed) and the latest update.

- **Request:** `GET http://127.0.0.1:1274/api/complaints/my`
- **Query:** `tab=all`
- **Auth:** Bearer token (patientToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "My complaints",
  "data": {
    "counts": {
      "all": 4,
      "open": 2,
      "underReview": 1,
      "closed": 1
    },
    "complaints": [
      {
        "id": "6aeb92245d3cdae6a0e94524",
        "code": "C-208",
        "issueType": "Medicine listed but unavailable",
        "pharmacy": "Green Life Pharmacy",
        "reservation": null,
        "status": "Open",
        "statusLabel": "Open",
        "latestUpdate": "Waiting for the pharmacy to respond.",
        "createdAt": "2026-11-04T20:14:28.884Z"
      },
      {
        "id": "6aeb92245d3cdae6a0e94519",
        "code": "C-207",
        "issueType": "Overcharging",
        "pharmacy": "Lazz Pharma",
        "reservation": "R-1001",
        "status": "Open",
        "statusLabel": "Open",
  ...
```

#### M4-F2-04 - Owner: complaints about my pharmacy

Owner sees complaints about their pharmacy with description and evidence.

- **Request:** `GET http://127.0.0.1:1274/api/owner/complaints`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaints about your pharmacy",
  "data": {
    "complaints": [
      {
        "id": "6aeb92245d3cdae6a0e94519",
        "code": "C-207",
        "issueType": "Overcharging",
        "pharmacy": "Lazz Pharma",
        "reservation": "R-1001",
        "status": "Open",
        "statusLabel": "Open",
        "latestUpdate": "Waiting for the pharmacy to respond.",
        "createdAt": "2026-11-04T20:14:28.771Z",
        "from": "Ayesha Siddika",
        "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
        "evidence": [
          "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
        ],
        "responded": false
      },
      {
        "id": "6aeb92200f523725a4aad793",
        "code": "C-206",
        "issueType": "Rude behaviour",
        "pharmacy": "Lazz Pharma",
        "reservation": null,
        "status": "Dismissed",
        "statusLabel": "Dismissed",
  ...
```

#### M4-F2-05 - Owner responds to complaint

The pharmacy owner replies; the patient is notified.

- **Request:** `PATCH http://127.0.0.1:1274/api/owner/complaints/{{complaintId}}/response`
- **Auth:** Bearer token (ownerToken)
- **Expected status:** 200

```json
{
  "message": "We apologise. The difference has been refunded and our price list is now updated."
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Response sent",
  "data": {
    "id": "6aeb92245d3cdae6a0e94519",
    "code": "C-207",
    "issueType": "Overcharging",
    "pharmacy": "Lazz Pharma",
    "reservation": "R-1001",
    "status": "Open",
    "statusLabel": "Open",
    "latestUpdate": "Pharmacy replied.",
    "createdAt": "2026-11-04T20:14:28.771Z",
    "targetType": "reservation",
    "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
    "evidence": [
      "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
    ],
    "pharmacyResponse": {
      "message": "We apologise. The difference has been refunded and our price list is now updated.",
      "respondedAt": "2026-11-04T20:14:29.367Z",
      "respondedBy": "3f0548d04ab026d93b0952c5"
    },
    "resolutionNote": null,
    "history": [
      {
        "action": "filed",
        "status": "Open",
        "statusLabel": "Open",
        "note": "Overcharging",
  ...
```

#### M4-F2-N3 - Other pharmacy owner cannot respond (403) (error case)

Only the owner of the pharmacy concerned can respond.

- **Request:** `PATCH http://127.0.0.1:1274/api/owner/complaints/{{complaintId}}/response`
- **Auth:** Bearer token (owner2Token)
- **Expected status:** 403

```json
{
  "message": "This is not our complaint."
}
```

Response (403, recorded by the Newman run):

```json
{
  "success": false,
  "message": "This complaint is not about your pharmacy"
}
```

#### M4-F2-06 - Admin: complaints list

Admin list filtered by status with counts (Open, Under review, Resolved, Dismissed).

- **Request:** `GET http://127.0.0.1:1274/api/admin/complaints`
- **Query:** `status=Open`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaints",
  "data": {
    "counts": {
      "open": 3,
      "underReview": 1,
      "resolved": 3,
      "dismissed": 1
    },
    "complaints": [
      {
        "id": "6aeb92245d3cdae6a0e94524",
        "code": "C-208",
        "issueType": "Medicine listed but unavailable",
        "pharmacy": "Green Life Pharmacy",
        "reservation": null,
        "status": "Open",
        "statusLabel": "Open",
        "latestUpdate": "Waiting for the pharmacy to respond.",
        "createdAt": "2026-11-04T20:14:28.884Z",
        "filedBy": "Ayesha Siddika"
      },
      {
        "id": "6aeb92245d3cdae6a0e94519",
        "code": "C-207",
        "issueType": "Overcharging",
        "pharmacy": "Lazz Pharma",
        "reservation": "R-1001",
        "status": "Open",
  ...
```

#### M4-F2-07 - Complaint detail with history

Full complaint with evidence, pharmacy response and history. Admins also see the pharmacy's valid-complaint record.

- **Request:** `GET http://127.0.0.1:1274/api/complaints/{{complaintId}}`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaint details",
  "data": {
    "id": "6aeb92245d3cdae6a0e94519",
    "code": "C-207",
    "issueType": "Overcharging",
    "pharmacy": "Lazz Pharma",
    "reservation": "R-1001",
    "status": "Open",
    "statusLabel": "Open",
    "latestUpdate": "Pharmacy replied.",
    "createdAt": "2026-11-04T20:14:28.771Z",
    "targetType": "reservation",
    "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
    "evidence": [
      "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
    ],
    "filedBy": "Ayesha Siddika",
    "pharmacyResponse": {
      "message": "We apologise. The difference has been refunded and our price list is now updated.",
      "respondedAt": "2026-11-04T20:14:29.367Z",
      "respondedBy": "3f0548d04ab026d93b0952c5"
    },
    "resolutionNote": null,
    "history": [
      {
        "action": "filed",
        "status": "Open",
        "statusLabel": "Open",
  ...
```

#### M4-F2-08 - Admin: move to Under Review

Status workflow Open -> Under Review -> Resolved / Dismissed.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/complaints/{{complaintId}}/status`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "status": "UnderReview"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaint status updated",
  "data": {
    "complaint": {
      "id": "6aeb92245d3cdae6a0e94519",
      "code": "C-207",
      "issueType": "Overcharging",
      "pharmacy": "Lazz Pharma",
      "reservation": "R-1001",
      "status": "UnderReview",
      "statusLabel": "Under Review",
      "latestUpdate": "Pharmacy replied. Admin is reviewing.",
      "createdAt": "2026-11-04T20:14:28.771Z",
      "targetType": "reservation",
      "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
      "evidence": [
        "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
      ],
      "pharmacyResponse": {
        "message": "We apologise. The difference has been refunded and our price list is now updated.",
        "respondedAt": "2026-11-04T20:14:29.367Z",
        "respondedBy": "3f0548d04ab026d93b0952c5"
      },
      "resolutionNote": null,
      "history": [
        {
          "action": "filed",
          "status": "Open",
          "statusLabel": "Open",
  ...
```

#### M4-F2-09 - Admin: resolve complaint

Resolving or dismissing requires a resolution note visible to the patient and pharmacy.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/complaints/{{complaintId}}/status`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "status": "Resolved",
  "resolutionNote": "Overcharge confirmed and refunded. Warning issued to the pharmacy."
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Complaint status updated",
  "data": {
    "complaint": {
      "id": "6aeb92245d3cdae6a0e94519",
      "code": "C-207",
      "issueType": "Overcharging",
      "pharmacy": "Lazz Pharma",
      "reservation": "R-1001",
      "status": "Resolved",
      "statusLabel": "Resolved",
      "latestUpdate": "Admin: Overcharge confirmed and refunded. Warning issued to the pharmacy.",
      "createdAt": "2026-11-04T20:14:28.771Z",
      "targetType": "reservation",
      "description": "I was charged Tk 16 per tablet but the app listed Tk 14 per tablet for Monas 10.",
      "evidence": [
        "/uploads/evidence/1793823268759-2f9b9cca7d72.png"
      ],
      "pharmacyResponse": {
        "message": "We apologise. The difference has been refunded and our price list is now updated.",
        "respondedAt": "2026-11-04T20:14:29.367Z",
        "respondedBy": "3f0548d04ab026d93b0952c5"
      },
      "resolutionNote": "Overcharge confirmed and refunded. Warning issued to the pharmacy.",
      "history": [
        {
          "action": "filed",
          "status": "Open",
          "statusLabel": "Open",
  ...
```

#### M4-F2-N4 - Invalid status change on a closed complaint (409) (error case)

Resolved and Dismissed are final states.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/complaints/{{complaintId}}/status`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 409

```json
{
  "status": "UnderReview"
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Invalid status change Resolved -> Under Review. Allowed: none (final state)"
}
```

#### M4-F2-N5 - Suspension without repeated valid complaints (409) (error case)

Green Life Pharmacy does not meet the suspension threshold.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/e9a8e974b7602290887787a9/suspend`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 409

```json
{
  "reason": "Testing the threshold rule"
}
```

Response (409, recorded by the Newman run):

```json
{
  "success": false,
  "message": "Suspension requires at least 3 valid complaints in the last 30 days (this pharmacy has 0)"
}
```

#### M4-F2-10 - Admin: suspend pharmacy after repeated valid complaints

Allowed only when the pharmacy has at least 3 resolved complaints in the last 30 days. Suspended pharmacies disappear from search.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/690efc4e8f369b935e83cb6b/suspend`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "reason": "Three upheld complaints (overcharging, unavailable stock, refusal) in 30 days"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy suspended",
  "data": {
    "id": "690efc4e8f369b935e83cb6b",
    "name": "Care Medicine Corner",
    "isSuspended": true,
    "suspension": {
      "reason": "Three upheld complaints (overcharging, unavailable stock, refusal) in 30 days",
      "at": "2026-11-04T20:14:30.185Z",
      "by": "fa42c94a49ce2fbf483a219d"
    },
    "validComplaintsLast30Days": 3,
    "visibleInSearch": false
  }
}
```

#### M4-F2-11 - Admin: reinstate pharmacy

Lift a suspension after an appeal.

- **Request:** `PATCH http://127.0.0.1:1274/api/admin/pharmacies/690efc4e8f369b935e83cb6b/reinstate`
- **Auth:** Bearer token (adminToken)
- **Expected status:** 200

```json
{
  "note": "Appeal accepted after staff training"
}
```

Response (200, recorded by the Newman run):

```json
{
  "success": true,
  "message": "Pharmacy reinstated",
  "data": {
    "id": "690efc4e8f369b935e83cb6b",
    "name": "Care Medicine Corner",
    "isSuspended": false,
    "visibleInSearch": true
  }
}
```
