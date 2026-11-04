/**
 * End-to-end API tests for all 8 features (node:test + supertest).
 * Uses a separate database (<db>_test), re-seeded before the run:  npm test
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');

process.env.NODE_ENV = 'test';
process.env.CRON_ENABLED = 'false';
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
process.env.MONGODB_URI = process.env.MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');

const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/config/db');
const createApp = require('../src/app');
const M = require('../src/models');
const { localParts, addDays } = require('../src/utils/helpers');

const app = createApp({ label: 'test' });
const api = () => request(app);
const tokens = {};
const ids = {};
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
const tomorrow = localParts(addDays(new Date(), 1)).dateKey;

async function login(email, password = 'Password@123') {
  const res = await api().post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.text);
  return res.body.data.token;
}
const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

before(async () => {
  execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/seed.js')], { env: process.env, stdio: 'ignore' });
  await connectDB();
  tokens.admin = await login('admin@medfind.test', 'Admin@12345');
  tokens.owner = await login('rahim.owner@medfind.test');
  tokens.greenOwner = await login('tanvir.owner@medfind.test');
  tokens.newOwner = await login('new.owner@medfind.test');
  tokens.patient = await login('ayesha@medfind.test');
  tokens.patient2 = await login('imran@medfind.test');
  ids.lazz = (await M.Pharmacy.findOne({ name: 'Lazz Pharma' }))._id.toString();
  ids.care = (await M.Pharmacy.findOne({ name: 'Care Medicine Corner' }))._id.toString();
  ids.green = (await M.Pharmacy.findOne({ name: 'Green Life Pharmacy' }))._id.toString();
  ids.shapla = (await M.Pharmacy.findOne({ name: 'Shapla Pharmacy' }))._id.toString();
  ids.napa = (await M.MasterMedicine.findOne({ brandName: 'Napa' }))._id.toString();
  ids.ostocal = (await M.MasterMedicine.findOne({ brandName: 'Ostocal' }))._id.toString();
  ids.zimax = (await M.MasterMedicine.findOne({ brandName: 'Zimax 500' }))._id.toString();
  ids.lazzNapaItem = (await M.CatalogItem.findOne({ pharmacy: ids.lazz, medicine: ids.napa }))._id.toString();
});

after(async () => {
  await disconnectDB();
});

describe('Common auth', () => {
  test('rejects missing token with 401', async () => {
    const res = await api().get('/api/owner/catalog');
    assert.equal(res.status, 401);
  });
  test('rejects wrong role with 403', async () => {
    const res = await api().get('/api/owner/catalog').set(auth('patient'));
    assert.equal(res.status, 403);
  });
  test('rejects duplicate registration with 409', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Ayesha Again', email: 'ayesha@medfind.test', password: 'Password@123' });
    assert.equal(res.status, 409);
  });
});

describe('Member 1 - Feature 1: Medicine Catalog Management', () => {
  test('master list search flags medicines already in catalog', async () => {
    const res = await api().get('/api/master-medicines?search=napa').set(auth('owner'));
    assert.equal(res.status, 200);
    const napa = res.body.data.medicines.find((m) => m.brandName === 'Napa');
    assert.equal(napa.alreadyInCatalog, true);
  });
  test('list catalog with status counts', async () => {
    const res = await api().get('/api/owner/catalog?status=low_stock').set(auth('owner'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.counts.all >= 9);
    assert.ok(res.body.data.items.every((i) => i.stockStatus === 'Low stock'));
  });
  test('add medicine from master list (201) and duplicate (409)', async () => {
    const body = { masterMedicineId: ids.ostocal, price: 9.5, stockQuantity: 120, minStockLevel: 20 };
    const res = await api().post('/api/owner/catalog').set(auth('owner')).send(body);
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.stockQuantity, 120);
    ids.ostocalItem = res.body.data.id;
    const dup = await api().post('/api/owner/catalog').set(auth('owner')).send(body);
    assert.equal(dup.status, 409);
  });
  test('invalid medicine data returns 400', async () => {
    const res = await api().post('/api/owner/catalog').set(auth('owner')).send({ masterMedicineId: 'abc', price: -1 });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length >= 2);
  });
  test('edit price & stock records price history and updates last updated', async () => {
    const res = await api().patch(`/api/owner/catalog/${ids.ostocalItem}`).set(auth('owner')).send({ price: 10, stockQuantity: 100 });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.data.price, 10);
    assert.equal(res.body.data.stockQuantity, 100);
    const hist = await api().get(`/api/owner/catalog/${ids.ostocalItem}/price-history`).set(auth('owner'));
    assert.equal(hist.body.data.history.length, 2);
  });
  test('get one catalog item; other owner gets 404', async () => {
    const ok = await api().get(`/api/owner/catalog/${ids.ostocalItem}`).set(auth('owner'));
    assert.equal(ok.status, 200);
    const other = await api().get(`/api/owner/catalog/${ids.ostocalItem}`).set(auth('greenOwner'));
    assert.equal(other.status, 404);
  });
  test('remove medicine (soft delete) then 404', async () => {
    const res = await api().delete(`/api/owner/catalog/${ids.ostocalItem}`).set(auth('owner'));
    assert.equal(res.status, 200);
    const again = await api().delete(`/api/owner/catalog/${ids.ostocalItem}`).set(auth('owner'));
    assert.equal(again.status, 404);
  });
});

describe('Member 1 - Feature 2: Stock & Expiry Tracking', () => {
  test('stock overview excludes expired batches', async () => {
    const res = await api().get('/api/owner/stock/overview').set(auth('owner'));
    assert.equal(res.status, 200);
    const napa = res.body.data.items.find((i) => i.medicine.brandName === 'Napa');
    assert.equal(napa.availableStock, 340);
    assert.equal(napa.expiredBatches, 1);
    assert.ok(res.body.data.summary.expiredBatches >= 2);
  });
  test('add batch (201), duplicate batch (409), expired batch (400)', async () => {
    const exp = localParts(addDays(new Date(), 400)).dateKey;
    const res = await api().post('/api/owner/stock/batches').set(auth('owner')).send({ catalogItemId: ids.lazzNapaItem, batchNumber: 'NP-2501', quantity: 200, expiryDate: exp, manufacturingDate: '2026-06-10', purchasePrice: 0.85 });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.availableStock, 540);
    ids.newBatch = res.body.data.batch.id;
    const dup = await api().post('/api/owner/stock/batches').set(auth('owner')).send({ catalogItemId: ids.lazzNapaItem, batchNumber: 'np-2501', quantity: 5, expiryDate: exp });
    assert.equal(dup.status, 409);
    const expired = await api().post('/api/owner/stock/batches').set(auth('owner')).send({ catalogItemId: ids.lazzNapaItem, batchNumber: 'NP-OLD', quantity: 5, expiryDate: '2025-01-01' });
    assert.equal(expired.status, 400);
  });
  test('batches listed earliest-expiry first with next batch to use', async () => {
    const res = await api().get(`/api/owner/stock/items/${ids.lazzNapaItem}/batches`).set(auth('owner'));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.nextBatchToUse.batchNumber, 'NP-2411');
    assert.equal(res.body.data.expiredUnits, 60);
  });
  test('edit and delete batch recalculate stock', async () => {
    const upd = await api().patch(`/api/owner/stock/batches/${ids.newBatch}`).set(auth('owner')).send({ quantity: 150 });
    assert.equal(upd.status, 200, upd.text);
    assert.equal(upd.body.data.availableStock, 490);
    const del = await api().delete(`/api/owner/stock/batches/${ids.newBatch}`).set(auth('owner'));
    assert.equal(del.status, 200);
    assert.equal(del.body.data.availableStock, 340);
  });
  test('expiry inventory 30/60/90/expired', async () => {
    const res = await api().get('/api/owner/stock/expiry?window=30').set(auth('owner'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.counts.within30Days >= 2);
    assert.ok(res.body.data.counts.within90Days >= res.body.data.counts.within60Days);
    const exp = await api().get('/api/owner/stock/expiry?window=expired').set(auth('owner'));
    assert.equal(exp.body.data.batches.length, 2);
    const bad = await api().get('/api/owner/stock/expiry?window=45').set(auth('owner'));
    assert.equal(bad.status, 400);
  });
  test('dispense consumes earliest-expiring batch first; too much -> 409', async () => {
    const res = await api().post(`/api/owner/stock/items/${ids.lazzNapaItem}/dispense`).set(auth('owner')).send({ quantity: 130 });
    assert.equal(res.status, 200, res.text);
    assert.deepEqual(res.body.data.consumedBatches.map((b) => [b.batchNumber, b.quantity]), [['NP-2411', 120], ['NP-2409', 10]]);
    assert.equal(res.body.data.availableStock, 210);
    const tooMuch = await api().post(`/api/owner/stock/items/${ids.lazzNapaItem}/dispense`).set(auth('owner')).send({ quantity: 5000 });
    assert.equal(tooMuch.status, 409);
  });
});

describe('Member 2 - Feature 1: Medicine Details & Reservation Request', () => {
  test('medicine details lists only verified pharmacies with price/stock/updated', async () => {
    const res = await api().get(`/api/medicines/${ids.napa}`);
    assert.equal(res.status, 200);
    const names = res.body.data.pharmacies.map((p) => p.pharmacy.name);
    assert.ok(names.includes('Lazz Pharma'));
    assert.ok(!names.includes('Shapla Pharmacy'));
    assert.ok(res.body.data.priceRange.min <= res.body.data.priceRange.max);
  });
  test('availability summary with estimated total', async () => {
    const res = await api().get(`/api/medicines/${ids.napa}/pharmacies/${ids.lazz}/availability?quantity=10`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.estimatedTotal, 12);
  });
  test('unverified pharmacy -> 404', async () => {
    const res = await api().get(`/api/medicines/${ids.napa}/pharmacies/${ids.shapla}/availability`);
    assert.equal(res.status, 404);
  });
  test('create reservation (201, Pending); insufficient stock (409); prescription required (400)', async () => {
    const res = await api().post('/api/reservations').set(auth('patient2'))
      .field('medicineId', ids.napa).field('pharmacyId', ids.lazz).field('quantity', '10')
      .field('pickupDate', tomorrow).field('pickupTime', '18:00').field('note', 'Need the 500 mg strip');
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.reservation.status, 'Pending');
    ids.res1 = res.body.data.reservation.id;

    const tamanna = (await M.Pharmacy.findOne({ name: 'Tamanna Pharmacy' }))._id.toString();
    const big = await api().post('/api/reservations').set(auth('patient2')).send({ medicineId: ids.napa, pharmacyId: tamanna, quantity: 200, pickupDate: tomorrow, pickupTime: '18:00' });
    assert.equal(big.status, 409);

    const rx = await api().post('/api/reservations').set(auth('patient2')).send({ medicineId: ids.zimax, pharmacyId: ids.lazz, quantity: 3, pickupDate: tomorrow, pickupTime: '18:00' });
    assert.equal(rx.status, 400);

    const withRx = await api().post('/api/reservations').set(auth('patient2'))
      .field('medicineId', ids.zimax).field('pharmacyId', ids.lazz).field('quantity', '3')
      .field('pickupDate', tomorrow).field('pickupTime', '18:00')
      .attach('prescription', PNG, { filename: 'rx.png', contentType: 'image/png' });
    assert.equal(withRx.status, 201, withRx.text);
    assert.ok(withRx.body.data.reservation.prescriptionUrl);
  });
  test('pickup outside opening hours -> 400', async () => {
    const res = await api().post('/api/reservations').set(auth('patient')).send({ medicineId: ids.napa, pharmacyId: ids.lazz, quantity: 1, pickupDate: tomorrow, pickupTime: '23:30' });
    assert.equal(res.status, 400);
  });
  test('upload prescription to pending reservation', async () => {
    const res = await api().put(`/api/reservations/${ids.res1}/prescription`).set(auth('patient2')).attach('prescription', PNG, { filename: 'rx.png', contentType: 'image/png' });
    assert.equal(res.status, 200, res.text);
    const other = await api().put(`/api/reservations/${ids.res1}/prescription`).set(auth('patient')).attach('prescription', PNG, { filename: 'rx.png', contentType: 'image/png' });
    assert.equal(other.status, 403);
  });
});

describe('Member 2 - Feature 2: Reservation Status Tracking', () => {
  test('patient list with tab counts', async () => {
    const res = await api().get('/api/reservations/my?tab=active').set(auth('patient2'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.counts.active >= 2);
  });
  test('owner inbox shows pending', async () => {
    const res = await api().get('/api/owner/reservations?status=Pending').set(auth('owner'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.reservations.some((r) => r.id === ids.res1));
  });
  test('invalid transition Pending -> Collected is 409', async () => {
    const res = await api().patch(`/api/owner/reservations/${ids.res1}/status`).set(auth('owner')).send({ status: 'Collected' });
    assert.equal(res.status, 409);
  });
  test('full workflow Pending -> Confirmed -> ReadyForPickup -> Collected reduces stock FEFO', async () => {
    const before = await M.CatalogItem.findById(ids.lazzNapaItem);
    for (const status of ['Confirmed', 'ReadyForPickup']) {
      const r = await api().patch(`/api/owner/reservations/${ids.res1}/status`).set(auth('owner')).send({ status });
      assert.equal(r.status, 200, r.text);
    }
    const cancel = await api().patch(`/api/reservations/${ids.res1}/cancel`).set(auth('patient2')).send({});
    assert.equal(cancel.status, 409, 'cannot cancel once Ready for pickup');
    const done = await api().patch(`/api/owner/reservations/${ids.res1}/status`).set(auth('owner')).send({ status: 'Collected' });
    assert.equal(done.status, 200, done.text);
    assert.equal(done.body.data.remainingStock, before.stockQuantity - 10);
    assert.equal(done.body.data.consumedBatches[0].batchNumber, 'NP-2409');
  });
  test('timeline detail for patient', async () => {
    const res = await api().get(`/api/reservations/${ids.res1}`).set(auth('patient2'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.timeline.steps.every((s) => s.done));
    const stranger = await api().get(`/api/reservations/${ids.res1}`).set(auth('patient'));
    assert.equal(stranger.status, 403);
  });
  test('reject with reason, and cancel by patient', async () => {
    const r = await M.Reservation.findOne({ status: 'Pending', pharmacy: ids.lazz, medicineSnapshot: { $exists: true }, 'medicineSnapshot.brandName': 'Seclo 20' });
    const rej = await api().patch(`/api/owner/reservations/${r._id}/reject`).set(auth('owner')).send({ reason: 'Out of stock', message: 'New stock arrives Thursday.' });
    assert.equal(rej.status, 200, rej.text);
    const badReason = await api().patch(`/api/owner/reservations/${r._id}/reject`).set(auth('owner')).send({ reason: 'Whatever' });
    assert.equal(badReason.status, 400);
    const mine = await M.Reservation.findOne({ status: 'Pending', 'pharmacySnapshot.name': 'Lazz Pharma', 'medicineSnapshot.brandName': 'Napa' });
    const c = await api().patch(`/api/reservations/${mine._id}/cancel`).set(auth('patient')).send({ reason: 'Bought elsewhere' });
    assert.equal(c.status, 200, c.text);
  });
  test('admin expires overdue reservations; non-admin forbidden', async () => {
    const forbidden = await api().post('/api/admin/reservations/expire-overdue').set(auth('owner'));
    assert.equal(forbidden.status, 403);
    const res = await api().post('/api/admin/reservations/expire-overdue').set(auth('admin'));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.expiredCount >= 1);
  });
});

describe('Member 3 - Feature 1: Medicine Search & Filter', () => {
  test('suggestions return generic and brand matches', async () => {
    const res = await api().get('/api/search/suggestions?q=para');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.suggestions.some((s) => s.type === 'Generic' && s.name === 'Paracetamol'));
  });
  test('search with filters and pharmacy count', async () => {
    const res = await api().get('/api/search/medicines?q=paracetamol&dosageForm=Tablet&strength=500 mg&inStock=true');
    assert.equal(res.status, 200);
    const napa = res.body.data.results.find((r) => r.brandName === 'Napa');
    assert.ok(napa.pharmacyCount >= 4);
    assert.ok(res.body.data.results.every((r) => r.dosageForm === 'Tablet'));
  });
  test('price range and validation', async () => {
    const res = await api().get('/api/search/medicines?q=a&minPrice=20&maxPrice=40');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.results.every((r) => r.priceRange.max >= 20));
    const bad = await api().get('/api/search/medicines?minPrice=50&maxPrice=10');
    assert.equal(bad.status, 400);
  });
  test('no results message', async () => {
    const res = await api().get('/api/search/medicines?q=paracetamool');
    assert.equal(res.body.data.total, 0);
    assert.ok(res.body.data.message);
  });
  test('filter options and popular searches', async () => {
    const f = await api().get('/api/search/filters?q=paracetamol');
    assert.equal(f.status, 200);
    assert.ok(f.body.data.dosageForms.length > 0);
    const p = await api().get('/api/search/popular');
    assert.equal(p.status, 200);
    assert.ok(p.body.data.popular.length > 0);
  });
});

describe('Member 3 - Feature 2: Nearby Pharmacies & Sorting', () => {
  test('areas and resolve location', async () => {
    const a = await api().get('/api/locations/areas?city=Dhaka');
    assert.equal(a.status, 200);
    const r = await api().get('/api/locations/resolve?lat=23.8069&lng=90.3687');
    assert.equal(r.body.data.label, 'Mirpur 10, Dhaka');
  });
  test('nearby pharmacies stocking medicine sorted by distance', async () => {
    const res = await api().get(`/api/nearby/pharmacies?medicineId=${ids.napa}&lat=23.8069&lng=90.3687&radiusKm=5`);
    assert.equal(res.status, 200);
    const d = res.body.data.pharmacies.map((p) => p.distanceKm);
    assert.deepEqual(d, [...d].sort((x, y) => x - y));
    assert.ok(!res.body.data.pharmacies.some((p) => p.name === 'Shapla Pharmacy'));
  });
  test('sort by price and rating', async () => {
    const res = await api().get(`/api/nearby/pharmacies?medicineId=${ids.napa}&lat=23.8069&lng=90.3687&radiusKm=10&sort=price`);
    const prices = res.body.data.pharmacies.map((p) => p.listing.price);
    assert.deepEqual(prices, [...prices].sort((x, y) => x - y));
  });
  test('empty result suggests larger radius; missing location 400', async () => {
    const res = await api().get(`/api/nearby/pharmacies?medicineId=${ids.napa}&lat=22.326&lng=91.812&radiusKm=5`);
    assert.equal(res.body.data.total, 0);
    assert.deepEqual(res.body.data.emptyState.suggestions.largerRadiusKm, [10, 20]);
    const bad = await api().get('/api/nearby/pharmacies');
    assert.equal(bad.status, 400);
  });
  test('pharmacy summary for map marker', async () => {
    const res = await api().get(`/api/nearby/pharmacies/${ids.lazz}?lat=23.8069&lng=90.3687&medicineId=${ids.napa}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.distanceKm < 1);
  });
});

describe('Member 4 - Feature 1: Pharmacy Verification & Reviews', () => {
  test('owner registers pharmacy -> Pending; second time 409', async () => {
    const body = {
      name: 'Nadia Drug House', phone: '01720123456', email: 'nadia.pharmacy@example.com',
      addressLine: 'House 8, Road 11', area: 'Banani', city: 'Dhaka', lat: '23.7940', lng: '90.4050',
      openingHours: JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '09:00', close: '22:00' }))),
      openingHoursText: 'Daily 9:00 AM - 10:00 PM', tradeLicenceNo: 'TRD-2026-777001', drugLicenceNo: 'DL-DHK-77701',
    };
    let req = api().post('/api/pharmacies/register').set(auth('newOwner'));
    for (const [k, v] of Object.entries(body)) req = req.field(k, v);
    const res = await req.attach('licenceDocument', PNG, { filename: 'licence.png', contentType: 'image/png' });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.status, 'Pending');
    ids.newPharmacy = res.body.data.pharmacyId;
    const again = await api().post('/api/pharmacies/register').set(auth('newOwner')).send(body);
    assert.equal(again.status, 409);
  });
  test('unverified pharmacy hidden from public profile', async () => {
    const res = await api().get(`/api/pharmacies/${ids.newPharmacy}`);
    assert.equal(res.status, 404);
  });
  test('admin list and detail', async () => {
    const list = await api().get('/api/admin/pharmacies?status=Pending').set(auth('admin'));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.counts.pending >= 3);
    const det = await api().get(`/api/admin/pharmacies/${ids.newPharmacy}`).set(auth('admin'));
    assert.equal(det.status, 200);
    const notAdmin = await api().get('/api/admin/pharmacies').set(auth('owner'));
    assert.equal(notAdmin.status, 403);
  });
  test('verify requires checklist; reject requires note; verified appears publicly', async () => {
    const noChecklist = await api().patch(`/api/admin/pharmacies/${ids.newPharmacy}/verification`).set(auth('admin')).send({ status: 'Verified' });
    assert.equal(noChecklist.status, 400);
    const noNote = await api().patch(`/api/admin/pharmacies/${ids.shapla}/verification`).set(auth('admin')).send({ status: 'Rejected' });
    assert.equal(noNote.status, 400);
    const ok = await api().patch(`/api/admin/pharmacies/${ids.newPharmacy}/verification`).set(auth('admin'))
      .send({ status: 'Verified', note: 'Documents valid', checklist: { tradeLicenceMatches: true, drugLicenceValid: true, contactComplete: true, noDuplicate: true } });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.body.data.verifiedBadge, true);
    const pub = await api().get(`/api/pharmacies/${ids.newPharmacy}`);
    assert.equal(pub.status, 200);
    const mine = await api().get('/api/pharmacies/mine/verification').set(auth('newOwner'));
    assert.equal(mine.body.data.status, 'Verified');
  });
  test('rejected owner resubmits licence -> Pending', async () => {
    const t = await login('sabbir.owner@medfind.test');
    const res = await api().put('/api/pharmacies/mine/licence').set({ Authorization: `Bearer ${t}` }).send({ tradeLicenceNo: 'TRD-2026-019900', drugLicenceNo: 'DL-DHK-61000' });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.data.status, 'Pending');
  });
  test('profile with rating summary and reviews', async () => {
    const res = await api().get(`/api/pharmacies/${ids.lazz}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.verifiedBadge, true);
    assert.equal(res.body.data.rating.distribution.length, 5);
    const rv = await api().get(`/api/pharmacies/${ids.lazz}/reviews`);
    assert.ok(rv.body.data.reviews.length >= 4);
  });
  test('eligible patient reviews collected reservation; duplicates and ineligible blocked', async () => {
    const list = await api().get(`/api/pharmacies/${ids.lazz}/reviewable-reservations`).set(auth('patient'));
    assert.equal(list.status, 200);
    const target = list.body.data.reservations[0];
    assert.ok(target);
    const res = await api().post(`/api/pharmacies/${ids.lazz}/reviews`).set(auth('patient')).send({ reservationId: target.id, rating: 4, text: 'Stock was exactly as listed and the staff were helpful.' });
    assert.equal(res.status, 201, res.text);
    const dup = await api().post(`/api/pharmacies/${ids.lazz}/reviews`).set(auth('patient')).send({ reservationId: target.id, rating: 5 });
    assert.equal(dup.status, 409);
    const notCollected = await M.Reservation.findOne({ status: 'Cancelled' });
    const inel = await api().post(`/api/pharmacies/${notCollected.pharmacy}/reviews`).set(auth('patient')).send({ reservationId: notCollected._id.toString(), rating: 5 });
    assert.equal(inel.status, 403);
    const badRating = await api().post(`/api/pharmacies/${ids.lazz}/reviews`).set(auth('patient')).send({ reservationId: target.id, rating: 6 });
    assert.equal(badRating.status, 400);
  });
});

describe('Member 4 - Feature 2: Complaints & Disputes', () => {
  test('file reservation complaint with evidence; not-own reservation 403; invalid 400', async () => {
    const r = await M.Reservation.findOne({ 'pharmacySnapshot.name': 'Lazz Pharma', status: 'Collected', patient: (await M.User.findOne({ email: 'ayesha@medfind.test' }))._id });
    const res = await api().post('/api/complaints').set(auth('patient'))
      .field('targetType', 'reservation').field('reservationId', r._id.toString())
      .field('issueType', 'Overcharging').field('description', 'Charged Tk 2 per tablet instead of the listed Tk 1.20.')
      .attach('evidence', PNG, { filename: 'receipt.png', contentType: 'image/png' });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.data.status, 'Open');
    assert.equal(res.body.data.evidence.length, 1);
    ids.complaint = res.body.data.id;
    const notMine = await api().post('/api/complaints').set(auth('patient2')).send({ targetType: 'reservation', reservationId: r._id.toString(), issueType: 'Overcharging', description: 'Not my reservation at all.' });
    assert.equal(notMine.status, 403);
    const invalid = await api().post('/api/complaints').set(auth('patient')).send({ targetType: 'pharmacy', issueType: 'Bad', description: 'short' });
    assert.equal(invalid.status, 400);
  });
  test('my complaints and detail access control', async () => {
    const my = await api().get('/api/complaints/my').set(auth('patient'));
    assert.equal(my.status, 200);
    assert.ok(my.body.data.counts.all >= 2);
    const stranger = await api().get(`/api/complaints/${ids.complaint}`).set(auth('patient2'));
    assert.equal(stranger.status, 403);
  });
  test('owner responds; other owner cannot', async () => {
    const list = await api().get('/api/owner/complaints').set(auth('owner'));
    assert.ok(list.body.data.complaints.some((c) => c.id === ids.complaint));
    const res = await api().patch(`/api/owner/complaints/${ids.complaint}/response`).set(auth('owner')).send({ message: 'We have refunded the difference and retrained the cashier.' });
    assert.equal(res.status, 200, res.text);
    const other = await api().patch(`/api/owner/complaints/${ids.complaint}/response`).set(auth('greenOwner')).send({ message: 'Not our complaint at all.' });
    assert.equal(other.status, 403);
  });
  test('admin status workflow with invalid transition', async () => {
    const list = await api().get('/api/admin/complaints?status=Open').set(auth('admin'));
    assert.equal(list.status, 200);
    const ur = await api().patch(`/api/admin/complaints/${ids.complaint}/status`).set(auth('admin')).send({ status: 'UnderReview' });
    assert.equal(ur.status, 200, ur.text);
    const noNote = await api().patch(`/api/admin/complaints/${ids.complaint}/status`).set(auth('admin')).send({ status: 'Resolved' });
    assert.equal(noNote.status, 400);
    const res = await api().patch(`/api/admin/complaints/${ids.complaint}/status`).set(auth('admin')).send({ status: 'Resolved', resolutionNote: 'Refund confirmed.' });
    assert.equal(res.status, 200);
    const back = await api().patch(`/api/admin/complaints/${ids.complaint}/status`).set(auth('admin')).send({ status: 'UnderReview' });
    assert.equal(back.status, 409);
  });
  test('suspension needs repeated valid complaints; suspended pharmacy hidden from search', async () => {
    const tooFew = await api().patch(`/api/admin/pharmacies/${ids.green}/suspend`).set(auth('admin')).send({ reason: 'Repeated complaints' });
    assert.equal(tooFew.status, 409);
    const res = await api().patch(`/api/admin/pharmacies/${ids.care}/suspend`).set(auth('admin')).send({ reason: 'Three upheld complaints in 30 days' });
    assert.equal(res.status, 200, res.text);
    const details = await api().get(`/api/medicines/${ids.napa}`);
    assert.ok(!details.body.data.pharmacies.some((p) => p.pharmacy.name === 'Care Medicine Corner'));
    const back = await api().patch(`/api/admin/pharmacies/${ids.care}/reinstate`).set(auth('admin')).send({ note: 'Appeal accepted' });
    assert.equal(back.status, 200);
  });
});
