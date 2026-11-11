# MedFind BD - Frontend

React 19 + Vite 6 + React Router 7 + Tailwind CSS 4, built from the group's Figma designs (34 screens, 8 features).
It talks to the MedFind BD REST API in `../backend`.

## Run it

You need the backend running first. The frontend uses the **all-features server** (port 5000), because one screen can use
several members' APIs (for example, the home page search is Member 3's and the medicine page is Member 2's).

```bash
# terminal 1 - backend (all 8 features on port 5000)
cd backend
npm start

# terminal 2 - frontend
cd frontend
npm install
cp .env.example .env      # Command Prompt: copy .env.example .env
npm run dev
```

Open http://localhost:5173. Log in with a demo account (the login page has one-click buttons):

| Role | Email | Password | Lands on |
|---|---|---|---|
| Patient | ayesha@medfind.test | Password@123 | Home / search |
| Pharmacy owner | rahim.owner@medfind.test | Password@123 | Owner dashboard |
| Admin | admin@medfind.test | Admin@12345 | Pharmacy verification |

Demo data is relative to the day it was seeded (pickup times, expiry dates). Before a demo, run `npm run seed` in
`backend` - it resets the **shared** database for everyone, so tell the group first.

## Environment (`frontend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `/api` | Where the browser sends API calls. Keep `/api` in development; for a deployed frontend use the full backend URL. |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:5000` | Development only: which backend Vite forwards `/api` and `/uploads` to. |

There are **no secrets** in the frontend `.env` (anything starting with `VITE_` is visible in the browser). The database
password lives only in `backend/.env`.

## Screens by member

| Member | Feature | Route | Figma screen |
|---|---|---|---|
| 1 Audrija | Medicine Catalog Management | `/owner/catalog` | F1-01 list, F1-04 remove confirm |
| | | `/owner/catalog/add` | F1-02 add from master list |
| | | `/owner/catalog/:id/edit` | F1-03 edit |
| | Stock & Expiry Tracking | `/owner/stock` | F2-01 stock overview |
| | | `/owner/stock/add-batch` | F2-02 add batch |
| | | `/owner/stock/:itemId/batches` | F2-03 medicine batches |
| | | `/owner/stock/expiry` | F2-04 expiry inventory |
| 2 Rafi | Medicine Details & Reservation Request | `/medicines/:id` | F1-01 details |
| | | `/medicines/:id/reserve/:pharmacyId` | F1-02 request form |
| | | `/reservations/:id/submitted` | F1-03 request submitted |
| | Reservation Status Tracking | `/reservations` | F2-01 my reservations |
| | | `/reservations/:id` | F2-02 status timeline |
| | | `/owner/reservations` | F2-03 owner inbox |
| | | `/owner/reservations/:id` | F2-04 owner detail, F2-05 reject modal |
| 3 Muqit | Medicine Search & Filter | `/` | F1-01 search with suggestions |
| | | `/medicines?q=` | F1-02 results & filters, F1-03 no results |
| | Nearby Pharmacies & Sorting | `/nearby` | F2-01 nearby & sorting, F2-02 choose location, F2-03 none nearby |
| 4 Didarul | Pharmacy Verification & Reviews | `/admin/pharmacies` | F1-01 pending pharmacies |
| | | `/admin/pharmacies/:id` | F1-02 verify pharmacy |
| | | `/pharmacies/:id` | F1-03 profile with reviews |
| | | `/pharmacies/:id/review` | F1-04 write a review |
| | | `/owner/pharmacy` | registration + licence submission (owner side) |
| | Complaints & Disputes | `/complaints/new` | F2-01 file a complaint |
| | | `/complaints` , `/complaints/:id` | F2-02 my complaints |
| | | `/owner/complaints` | F2-03 owner respond |
| | | `/admin/complaints` | F2-04 admin list |
| | | `/admin/complaints/:id` | F2-05 admin review + suspend |

Common (not assessed features): `/login`, `/register`, `/owner` dashboard. Nav items for later modules
(Favourites, Alerts, Featured Pharmacies, Master Medicines) are shown greyed out.

## Code layout

```
src/
  main.jsx, App.jsx          router: public (top bar), /owner and /admin (sidebar)
  lib/api.js                 fetch wrapper: JWT header, JSON / multipart, error messages
  lib/useApi.js              data-loading hook (loading / error / reload)
  lib/format.js              Tk prices, dates in Asia/Dhaka time, "2 hours ago"
  context/AuthContext.jsx    login state (token in localStorage), role-based home page
  components/ui.jsx          buttons, cards, badges, tables, modals, chips, pagination...
  components/layouts.jsx     top-bar and sidebar layouts, route guard by role
  pages/member1..member4/    each member's screens
  pages/common/              login, sign up, owner dashboard
```

## Build

```bash
npm run build     # production files in dist/
npm run lint
```
