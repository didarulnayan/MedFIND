# Member Contribution

CSE471 - Group 02 - Section 03 - Project: **MedFind BD**

Every member owns two features, implemented in separate route / controller / service / validator files and served by
the member's own server on the port made from the last four digits of the student ID. Models, the database connection,
authentication and the stock engine are shared infrastructure.

| Member | Student ID | Port | Feature 01 | Feature 02 | Start command |
|---|---|---|---|---|---|
| Audrija Chowdhury | 22299421 | 9421 | Medicine Catalog Management | Stock & Expiry Tracking | `npm run start:member1` |
| Abdullah Al Zahur Rafi | 22299050 | 9050 | Medicine Details & Reservation Request | Reservation Status Tracking | `npm run start:member2` |
| Abdullah Al Muqit | 22201783 | 1783 | Medicine Search & Filter | Nearby Pharmacies & Sorting | `npm run start:member3` |
| Md Didarul Islam Nayan | 23301274 | 1274 | Pharmacy Verification & Reviews | Complaints & Disputes | `npm run start:member4` |


## Member 1: Audrija Chowdhury (22299421)

Server: `npm run start:member1` -> http://127.0.0.1:9421

### Feature 01: Medicine Catalog Management

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/master-medicines` | Owner |
| GET | `/api/owner/catalog` | Owner |
| POST | `/api/owner/catalog` | Owner |
| GET | `/api/owner/catalog/:itemId` | Owner |
| PATCH | `/api/owner/catalog/:itemId` | Owner |
| DELETE | `/api/owner/catalog/:itemId` | Owner |
| GET | `/api/owner/catalog/:itemId/price-history` | Owner |

### Feature 02: Stock & Expiry Tracking

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/owner/stock/overview` | Owner |
| POST | `/api/owner/stock/batches` | Owner |
| GET | `/api/owner/stock/items/:itemId/batches` | Owner |
| PATCH | `/api/owner/stock/batches/:batchId` | Owner |
| DELETE | `/api/owner/stock/batches/:batchId` | Owner |
| GET | `/api/owner/stock/expiry` | Owner |
| POST | `/api/owner/stock/items/:itemId/dispense` | Owner |

### Files owned

- Routes: `src/routes/catalog.routes.js`, `src/routes/stock.routes.js`
- Controllers: `src/controllers/catalog.controller.js`, `src/controllers/stock.controller.js`
- Services: `src/services/catalog.service.js`, `src/services/stock.service.js`, `src/services/inventory.service.js (shared stock engine)`
- Validators: `src/validators/member1.validators.js`
- Postman: `postman/Member1/` - Screenshots: `screenshots/Member1/` - Submission: `submissions/Member1_Assignment03.docx`


## Member 2: Abdullah Al Zahur Rafi (22299050)

Server: `npm run start:member2` -> http://127.0.0.1:9050

### Feature 01: Medicine Details & Reservation Request

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/medicines/:medicineId` | Public |
| GET | `/api/medicines/:medicineId/pharmacies/:pharmacyId/availability` | Public |
| POST | `/api/reservations` | Patient |
| PUT | `/api/reservations/:id/prescription` | Patient |

### Feature 02: Reservation Status Tracking

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/reservations/my` | Patient |
| GET | `/api/reservations/:id` | Any logged-in user (ownership checked) |
| PATCH | `/api/reservations/:id/cancel` | Patient |
| GET | `/api/owner/reservations` | Owner |
| PATCH | `/api/owner/reservations/:id/status` | Owner |
| PATCH | `/api/owner/reservations/:id/reject` | Owner |
| POST | `/api/admin/reservations/expire-overdue` | Admin |

### Files owned

- Routes: `src/routes/reservationRequest.routes.js`, `src/routes/reservationStatus.routes.js`
- Controllers: `src/controllers/reservationRequest.controller.js`, `src/controllers/reservationStatus.controller.js`
- Services: `src/services/reservationRequest.service.js`, `src/services/reservationStatus.service.js`
- Validators: `src/validators/member2.validators.js`
- Postman: `postman/Member2/` - Screenshots: `screenshots/Member2/` - Submission: `submissions/Member2_Assignment03.docx`


## Member 3: Abdullah Al Muqit (22201783)

Server: `npm run start:member3` -> http://127.0.0.1:1783

### Feature 01: Medicine Search & Filter

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/search/suggestions` | Public |
| GET | `/api/search/medicines` | Public |
| GET | `/api/search/filters` | Public |
| GET | `/api/search/popular` | Public |

### Feature 02: Nearby Pharmacies & Sorting

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/locations/areas` | Public |
| GET | `/api/locations/resolve` | Public |
| GET | `/api/nearby/pharmacies` | Public |
| GET | `/api/nearby/pharmacies/:pharmacyId` | Public |

### Files owned

- Routes: `src/routes/search.routes.js`, `src/routes/nearby.routes.js`
- Controllers: `src/controllers/search.controller.js`, `src/controllers/nearby.controller.js`
- Services: `src/services/search.service.js`, `src/services/nearby.service.js`
- Validators: `src/validators/member3.validators.js`
- Postman: `postman/Member3/` - Screenshots: `screenshots/Member3/` - Submission: `submissions/Member3_Assignment03.docx`


## Member 4: Md Didarul Islam Nayan (23301274)

Server: `npm run start:member4` -> http://127.0.0.1:1274

### Feature 01: Pharmacy Verification & Reviews

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/pharmacies/register` | Owner |
| GET | `/api/pharmacies/mine/verification` | Owner |
| PUT | `/api/pharmacies/mine/licence` | Owner |
| GET | `/api/admin/pharmacies` | Admin |
| GET | `/api/admin/pharmacies/:id` | Admin |
| PATCH | `/api/admin/pharmacies/:id/verification` | Admin |
| GET | `/api/pharmacies/:id` | Public |
| GET | `/api/pharmacies/:id/reviews` | Public |
| GET | `/api/pharmacies/:id/reviewable-reservations` | Patient |
| POST | `/api/pharmacies/:id/reviews` | Patient |

### Feature 02: Complaints & Disputes

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/complaints` | Patient |
| GET | `/api/complaints/my` | Patient |
| GET | `/api/complaints/:id` | Any logged-in user (ownership checked) |
| GET | `/api/owner/complaints` | Owner |
| PATCH | `/api/owner/complaints/:id/response` | Owner |
| GET | `/api/admin/complaints` | Admin |
| PATCH | `/api/admin/complaints/:id/status` | Admin |
| PATCH | `/api/admin/pharmacies/:id/suspend` | Admin |
| PATCH | `/api/admin/pharmacies/:id/reinstate` | Admin |

### Files owned

- Routes: `src/routes/verification.routes.js`, `src/routes/complaint.routes.js`
- Controllers: `src/controllers/verification.controller.js`, `src/controllers/complaint.controller.js`
- Services: `src/services/verification.service.js`, `src/services/complaint.service.js`
- Validators: `src/validators/member4.validators.js`
- Postman: `postman/Member4/` - Screenshots: `screenshots/Member4/` - Submission: `submissions/Member4_Assignment03.docx`
