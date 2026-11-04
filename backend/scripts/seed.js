/**
 * Seeds the DEVELOPMENT database with realistic demo data (no real patient information).
 * Safe to run repeatedly: it clears the MedFind collections first, so no duplicates are created.
 *
 *   npm run seed
 *
 * Demo accounts (development only) are printed at the end and documented in documentation/README.md.
 */
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const M = require('../src/models');
const { recalculateRating } = require('../src/services/verification.service');
const crypto = require('crypto');
const { Types } = require('mongoose');
const { localParts, addDays } = require('../src/utils/helpers');

/** Deterministic ObjectIds so Postman collections keep working after every re-seed. */
const oid = (key) => new Types.ObjectId(crypto.createHash('md5').update(`medfind:${key}`).digest('hex').slice(0, 24));

if (env.nodeEnv === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to reset a production database. Pass --force if you really mean it.');
  process.exit(1);
}

const DEMO_PASSWORD = 'Password@123';
const ADMIN_PASSWORD = 'Admin@12345';
const now = new Date();
const days = (n) => addDays(now, n);
const DAILY = (open, close) => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open, close }));

/** Local date (YYYY-MM-DD) n days from today at HH:mm, Dhaka time. */
function localAt(n, hhmm) {
  return new Date(`${localParts(days(n)).dateKey}T${hhmm}:00${env.timezoneOffset}`);
}

const AREAS = [
  ['Dhaka', 'Mirpur 1', 23.7957, 90.3537], ['Dhaka', 'Mirpur 2', 23.8057, 90.361], ['Dhaka', 'Mirpur 10', 23.8069, 90.3687],
  ['Dhaka', 'Mirpur 11', 23.8193, 90.3654], ['Dhaka', 'Uttara', 23.8728, 90.3984], ['Dhaka', 'Dhanmondi', 23.7461, 90.3742],
  ['Dhaka', 'Gulshan', 23.7925, 90.4078], ['Dhaka', 'Banani', 23.7937, 90.4066], ['Dhaka', 'Mohammadpur', 23.7662, 90.3589],
  ['Dhaka', 'Motijheel', 23.733, 90.4172], ['Chattogram', 'Agrabad', 22.326, 91.812], ['Chattogram', 'GEC Circle', 22.359, 91.8215],
];

// [brandName, genericName, manufacturer, strength, dosageForm, unit, requiresPrescription]
const MEDICINES = [
  ['Napa', 'Paracetamol', 'Beximco Pharmaceuticals', '500 mg', 'Tablet', 'pc', false],
  ['Napa Extra', 'Paracetamol + Caffeine', 'Beximco Pharmaceuticals', '500 mg + 65 mg', 'Tablet', 'pc', false],
  ['Napa Extend', 'Paracetamol', 'Beximco Pharmaceuticals', '665 mg', 'Tablet', 'pc', false],
  ['Napa Syrup', 'Paracetamol', 'Beximco Pharmaceuticals', '120 mg/5 ml', 'Syrup', 'bottle', false],
  ['Ace', 'Paracetamol', 'Square Pharmaceuticals', '500 mg', 'Tablet', 'pc', false],
  ['Ace Plus', 'Paracetamol + Caffeine', 'Square Pharmaceuticals', '500 mg + 65 mg', 'Tablet', 'pc', false],
  ['Ace Syrup', 'Paracetamol', 'Square Pharmaceuticals', '120 mg/5 ml', 'Syrup', 'bottle', false],
  ['Fast', 'Paracetamol', 'Acme Laboratories', '500 mg', 'Tablet', 'pc', false],
  ['Seclo 20', 'Omeprazole', 'Square Pharmaceuticals', '20 mg', 'Capsule', 'pc', false],
  ['Losectil 20', 'Omeprazole', 'Eskayef Pharmaceuticals', '20 mg', 'Capsule', 'pc', false],
  ['Sergel 20', 'Esomeprazole', 'Healthcare Pharmaceuticals', '20 mg', 'Capsule', 'pc', false],
  ['Maxpro 20', 'Esomeprazole', 'Renata', '20 mg', 'Tablet', 'pc', false],
  ['Pantonix 20', 'Pantoprazole', 'Incepta Pharmaceuticals', '20 mg', 'Tablet', 'pc', false],
  ['Fexo 120', 'Fexofenadine', 'Square Pharmaceuticals', '120 mg', 'Tablet', 'pc', false],
  ['Fenadin 120', 'Fexofenadine', 'Renata', '120 mg', 'Tablet', 'pc', false],
  ['Alatrol', 'Cetirizine', 'Square Pharmaceuticals', '10 mg', 'Tablet', 'pc', false],
  ['Monas 10', 'Montelukast', 'Acme Laboratories', '10 mg', 'Tablet', 'pc', false],
  ['Ostocal', 'Calcium + Vitamin D3', 'Square Pharmaceuticals', '500 mg + 200 IU', 'Tablet', 'pc', false],
  ['Orsaline-N', 'Oral Rehydration Salts', 'SMC Enterprise', '10.25 g', 'Powder', 'pack', false],
  ['Moxacil 500', 'Amoxicillin', 'Square Pharmaceuticals', '500 mg', 'Capsule', 'pc', true],
  ['Zimax 500', 'Azithromycin', 'Square Pharmaceuticals', '500 mg', 'Tablet', 'pc', true],
  ['Azithrocin 500', 'Azithromycin', 'Beximco Pharmaceuticals', '500 mg', 'Tablet', 'pc', true],
  ['Ciprocin 500', 'Ciprofloxacin', 'Square Pharmaceuticals', '500 mg', 'Tablet', 'pc', true],
  ['Cef-3 200', 'Cefixime', 'Square Pharmaceuticals', '200 mg', 'Capsule', 'pc', true],
  ['Filmet 400', 'Metronidazole', 'Beximco Pharmaceuticals', '400 mg', 'Tablet', 'pc', true],
  ['Amdocal 5', 'Amlodipine', 'Beximco Pharmaceuticals', '5 mg', 'Tablet', 'pc', true],
  ['Angilock 50', 'Losartan Potassium', 'Square Pharmaceuticals', '50 mg', 'Tablet', 'pc', true],
  ['Comet 500', 'Metformin', 'Square Pharmaceuticals', '500 mg', 'Tablet', 'pc', true],
  ['Ceftron 1 g', 'Ceftriaxone', 'Square Pharmaceuticals', '1 g', 'Injection', 'vial', true],
  ['Napa Suppository', 'Paracetamol', 'Beximco Pharmaceuticals', '250 mg', 'Tablet', 'pc', false],
];

async function main() {
  await connectDB();
  await Promise.all(Object.values(M).map((Model) => Model.deleteMany({})));
  await Promise.all(Object.values(M).map((Model) => Model.syncIndexes()));

  // ---------- areas ----------
  await M.Area.insertMany(AREAS.map(([city, name, lat, lng]) => ({ _id: oid(`area:${name}`), city, name, location: { type: 'Point', coordinates: [lng, lat] } })));

  // ---------- users ----------
  const mk = (name, email, role, phone, password = DEMO_PASSWORD) => M.User.create({ _id: oid(`user:${email}`), name, email, role, phone, password });
  const admin = await mk('Admin', 'admin@medfind.test', 'admin', '01700000000', ADMIN_PASSWORD);
  const ayesha = await mk('Ayesha Siddika', 'ayesha@medfind.test', 'patient', '01712000111');
  const imran = await mk('Imran Hossain', 'imran@medfind.test', 'patient', '01819222333');
  const sadia = await mk('Sadia Islam', 'sadia@medfind.test', 'patient', '01911444555');
  const owners = {
    lazz: await mk('Rahim Uddin', 'rahim.owner@medfind.test', 'owner', '01712345678'),
    tamanna: await mk('Kamal Hossain', 'kamal.owner@medfind.test', 'owner', '01713456789'),
    care: await mk('Nusrat Jahan', 'nusrat.owner@medfind.test', 'owner', '01714567890'),
    green: await mk('Tanvir Hasan', 'tanvir.owner@medfind.test', 'owner', '01715678901'),
    popular: await mk('Jahid Hasan', 'jahid.owner@medfind.test', 'owner', '01716789012'),
    shapla: await mk('Farhana Akter', 'farhana.owner@medfind.test', 'owner', '01717890123'),
    dhanmondi: await mk('Mahmud Hasan', 'mahmud.owner@medfind.test', 'owner', '01718901234'),
    medicare: await mk('Sabbir Ahmed', 'sabbir.owner@medfind.test', 'owner', '01719012345'),
  };
  await mk('Nadia Rahman', 'new.owner@medfind.test', 'owner', '01720123456'); // has no pharmacy yet: used to demo registration

  // ---------- pharmacies ----------
  const verifiedBy = (note) => ({
    status: 'Verified', note, reviewedBy: admin._id, reviewedAt: days(-60),
    checklist: { tradeLicenceMatches: true, drugLicenceValid: true, contactComplete: true, noDuplicate: true },
    history: [{ status: 'Pending', at: days(-62), note: 'Registration submitted' }, { status: 'Verified', by: admin._id, at: days(-60), note }],
  });
  const pending = { status: 'Pending', history: [{ status: 'Pending', at: days(-2), note: 'Registration submitted' }] };
  const P = async (key, name, area, line, lat, lng, phone, trade, drug, hours, hoursText, verification) =>
    M.Pharmacy.create({
      _id: oid(`pharmacy:${key}`),
      owner: owners[key]._id, name, phone, email: `${key}.pharmacy@example.com`,
      address: { line, area, city: 'Dhaka' }, location: { type: 'Point', coordinates: [lng, lat] },
      openingHours: hours, openingHoursText: hoursText,
      licence: { tradeLicenceNo: trade, drugLicenceNo: drug, submittedAt: verification.status === 'Pending' ? days(-2) : days(-62) },
      verification,
    });

  const ph = {
    lazz: await P('lazz', 'Lazz Pharma', 'Mirpur 10', 'House 12, Road 3', 23.8075, 90.368, '01712345678', 'TRD-2024-018832', 'DL-DHK-45721', DAILY('09:00', '22:00'), 'Daily 9:00 AM - 10:00 PM', verifiedBy('All documents valid')),
    tamanna: await P('tamanna', 'Tamanna Pharmacy', 'Mirpur 1', 'Plot 5, Section 1 Main Road', 23.796, 90.353, '01713456789', 'TRD-2022-077310', 'DL-DHK-30115', DAILY('08:00', '23:00'), 'Daily 8:00 AM - 11:00 PM', verifiedBy('Verified')),
    care: await P('care', 'Care Medicine Corner', 'Mirpur 2', 'Shop 7, Stadium Market', 23.805, 90.3625, '01714567890', 'TRD-2023-099120', 'DL-DHK-38811', DAILY('08:00', '11:00'), 'Daily 8:00 AM - 11:00 AM', verifiedBy('Verified')),
    green: await P('green', 'Green Life Pharmacy', 'Mirpur 11', 'House 40, Avenue 5', 23.819, 90.366, '01715678901', 'TRD-2025-004455', 'DL-DHK-52210', DAILY('00:00', '23:59'), 'Open 24 hours', verifiedBy('Verified')),
    popular: await P('popular', 'Popular Pharmacy', 'Dhanmondi', 'House 16, Road 2', 23.7465, 90.375, '01716789012', 'TRD-2021-055501', 'DL-DHK-21004', DAILY('09:00', '23:00'), 'Daily 9:00 AM - 11:00 PM', verifiedBy('Verified')),
    shapla: await P('shapla', 'Shapla Pharmacy', 'Uttara', 'House 3, Sector 7', 23.874, 90.399, '01717890123', 'TRD-2026-011122', 'DL-DHK-60117', DAILY('09:00', '21:00'), 'Daily 9:00 AM - 9:00 PM', pending),
    dhanmondi: await P('dhanmondi', 'Dhanmondi Health Pharmacy', 'Dhanmondi', 'House 22, Road 9A', 23.749, 90.372, '01718901234', 'TRD-2026-013344', 'DL-DHK-60342', DAILY('10:00', '22:00'), 'Daily 10:00 AM - 10:00 PM', pending),
    medicare: await P('medicare', 'Medicare Point', 'Gulshan', 'Road 45, Gulshan 2', 23.793, 90.408, '01719012345', 'TRD-2026-019900', 'DL-DHK-60999', DAILY('09:00', '21:00'), 'Daily 9:00 AM - 9:00 PM', {
      status: 'Rejected', note: 'Drug licence number does not match DGDA records', reviewedBy: admin._id, reviewedAt: days(-5),
      checklist: { tradeLicenceMatches: true, drugLicenceValid: false, contactComplete: true, noDuplicate: true },
      history: [{ status: 'Pending', at: days(-7), note: 'Registration submitted' }, { status: 'Rejected', by: admin._id, at: days(-5), note: 'Drug licence number does not match DGDA records' }],
    }),
  };

  // ---------- master medicines ----------
  const meds = await M.MasterMedicine.insertMany(MEDICINES.map(([brandName, genericName, manufacturer, strength, dosageForm, unit, requiresPrescription]) => ({ _id: oid(`medicine:${brandName}`), brandName, genericName, manufacturer, strength, dosageForm, unit, requiresPrescription })));
  const med = (brand) => meds.find((m) => m.brandName === brand);

  // ---------- catalogs + batches ----------
  // batches: [batchNumber, quantity, expiryInDays (negative = expired), mfgDaysAgo]
  async function stock(pharmacy, brand, price, minStockLevel, batches, updatedHoursAgo) {
    const item = await M.CatalogItem.create({ _id: oid(`item:${pharmacy.name}:${brand}`), pharmacy: pharmacy._id, medicine: med(brand)._id, price, minStockLevel, stockQuantity: 0 });
    for (const [batchNumber, quantity, exp, mfgAgo] of batches) {
      await M.InventoryBatch.create({ pharmacy: pharmacy._id, catalogItem: item._id, batchNumber, quantity, initialQuantity: quantity, expiryDate: days(exp), manufacturingDate: days(-(mfgAgo || 180)), purchasePrice: Number((price * 0.75).toFixed(2)) });
    }
    const available = batches.filter((b) => b[2] > 0).reduce((s, b) => s + b[1], 0);
    item.stockQuantity = available;
    item.lastUpdatedAt = new Date(now.getTime() - updatedHoursAgo * 3600 * 1000);
    await item.save();
    await M.PriceHistory.create({ catalogItem: item._id, pharmacy: pharmacy._id, oldPrice: null, newPrice: price, changedBy: pharmacy.owner, source: 'catalog-add', changedAt: days(-60) });
    return item;
  }

  const lazz = {
    napa: await stock(ph.lazz, 'Napa', 1.2, 50, [['NP-2411', 120, 37], ['NP-2412', 200, 580, 150], ['NP-2409', 20, 81], ['NP-2301', 60, -35, 700]], 2),
    seclo: await stock(ph.lazz, 'Seclo 20', 6, 50, [['SC-2208', 18, 20]], 24),
    aceSyrup: await stock(ph.lazz, 'Ace Syrup', 32, 20, [['AS-2203', 60, 25]], 72),
    fexo: await stock(ph.lazz, 'Fexo 120', 8, 20, [['FX-2201', 10, -35, 700]], 168),
    monas: await stock(ph.lazz, 'Monas 10', 14, 30, [['MN-2501', 40, 76], ['MN-2502', 30, 200], ['MN-2503', 25, 400]], 96),
    napaExtra: await stock(ph.lazz, 'Napa Extra', 2.5, 50, [['NX-2510', 300, 300]], 5),
    zimax: await stock(ph.lazz, 'Zimax 500', 35, 10, [['ZM-2507', 60, 420]], 30),
    alatrol: await stock(ph.lazz, 'Alatrol', 3, 30, [['AL-2504', 150, 55]], 10),
    orsaline: await stock(ph.lazz, 'Orsaline-N', 6, 40, [['OR-2509', 250, 500]], 8),
  };
  const tam = {
    napa: await stock(ph.tamanna, 'Napa', 1, 50, [['TN-1101', 120, 210]], 24),
    seclo: await stock(ph.tamanna, 'Seclo 20', 5.5, 40, [['TS-1102', 140, 160]], 30),
    ace: await stock(ph.tamanna, 'Ace', 1.1, 50, [['TA-1103', 400, 365]], 12),
    fexo: await stock(ph.tamanna, 'Fexo 120', 8.5, 20, [['TF-1104', 90, 240]], 48),
    moxacil: await stock(ph.tamanna, 'Moxacil 500', 12, 20, [['TM-1105', 100, 300]], 20),
  };
  const care = {
    napa: await stock(ph.care, 'Napa', 1.5, 30, [['CN-3101', 15, 120]], 5),
    fexo: await stock(ph.care, 'Fexo 120', 9, 20, [['CF-3102', 45, 150]], 26),
    ace: await stock(ph.care, 'Ace', 1.4, 30, [['CA-3103', 200, 400]], 30),
    napaSyrup: await stock(ph.care, 'Napa Syrup', 35, 10, [['CS-3104', 25, 200]], 40),
  };
  const green = {
    napa: await stock(ph.green, 'Napa', 1.1, 50, [['GN-4101', 500, 365]], 0.5),
    aceSyrup: await stock(ph.green, 'Ace Syrup', 30, 10, [['GS-4102', 40, 180]], 6),
    napaSyrup: await stock(ph.green, 'Napa Syrup', 28, 10, [['GN-4103', 30, 220]], 6),
    sergel: await stock(ph.green, 'Sergel 20', 7, 30, [['GE-4104', 220, 300]], 15),
    monas: await stock(ph.green, 'Monas 10', 13.5, 30, [['GM-4105', 140, 330]], 9),
    ciprocin: await stock(ph.green, 'Ciprocin 500', 15, 20, [['GC-4106', 80, 260]], 50),
  };
  await stock(ph.popular, 'Napa', 1.2, 50, [['PN-5101', 260, 300]], 3);
  await stock(ph.popular, 'Ace', 1.2, 50, [['PA-5102', 180, 280]], 4);
  await stock(ph.popular, 'Maxpro 20', 7, 30, [['PM-5103', 90, 410]], 20);
  await stock(ph.popular, 'Comet 500', 4, 30, [['PC-5104', 300, 380]], 33);
  await stock(ph.popular, 'Ceftron 1 g', 180, 5, [['PF-5105', 12, 290]], 70);
  await stock(ph.shapla, 'Napa', 1.2, 30, [['SN-6101', 100, 300]], 10); // pending pharmacy: must NOT appear publicly

  // ---------- reservations ----------
  let seq = 1000;
  async function reservation({ patient, pharmacy, item, qty, status, pickupAt, history, extra = {} }) {
    seq += 1;
    const m = await M.MasterMedicine.findById(item.medicine);
    return M.Reservation.create({
      code: `R-${seq}`, patient: patient._id, pharmacy: pharmacy._id, catalogItem: item._id, medicine: m._id,
      medicineSnapshot: { brandName: m.brandName, genericName: m.genericName, strength: m.strength, dosageForm: m.dosageForm, manufacturer: m.manufacturer, requiresPrescription: m.requiresPrescription },
      pharmacySnapshot: { name: pharmacy.name, area: pharmacy.address.area },
      quantity: qty, unitPrice: item.price, totalPrice: Number((item.price * qty).toFixed(2)),
      pickupAt, pickupDeadline: new Date(pickupAt.getTime() + env.reservation.graceMinutes * 60000),
      status, statusHistory: history, ...extra,
    });
  }
  const flow = (patient, owner, pickupAt, upTo) => {
    const steps = [['Pending', patient, -48, 'Request sent'], ['Confirmed', owner, -46, 'Availability confirmed'], ['ReadyForPickup', owner, -3, 'Ready for pickup'], ['Collected', owner, 0, 'Collected by patient']];
    const out = [];
    for (const [status, by, h, note] of steps) {
      out.push({ status, by: by._id, at: new Date(pickupAt.getTime() + h * 3600000), note });
      if (status === upTo) break;
    }
    return out;
  };
  const collected = async (patient, pharmacy, item, qty, dayOffset, extra = {}) => {
    const pickupAt = localAt(dayOffset, '18:00');
    return reservation({ patient, pharmacy, item, qty, status: 'Collected', pickupAt, history: flow(patient, { _id: pharmacy.owner }, pickupAt, 'Collected'), extra: { collectedAt: pickupAt, ...extra } });
  };

  // collected (history) - used for reviews and complaints
  const rAyeshaMonas = await collected(ayesha, ph.lazz, lazz.monas, 30, -16); // reviewable, not reviewed yet
  const rAyeshaNapa = await collected(ayesha, ph.lazz, lazz.napa, 10, -25, { reviewed: true });
  const rImranLazz = await collected(imran, ph.lazz, lazz.seclo, 14, -9, { reviewed: true });
  const rSadiaLazz = await collected(sadia, ph.lazz, lazz.napaExtra, 20, -14, { reviewed: true });
  const rImranLazz2 = await collected(imran, ph.lazz, lazz.alatrol, 10, -30, { reviewed: true });
  const rAyeshaGreen = await collected(ayesha, ph.green, green.aceSyrup, 1, -8, { reviewed: true });
  const rSadiaGreen = await collected(sadia, ph.green, green.napa, 20, -20, { reviewed: true });
  const rImranTam = await collected(imran, ph.tamanna, tam.ace, 20, -12, { reviewed: true });
  const rSadiaCare = await collected(sadia, ph.care, care.fexo, 10, -18);
  const rImranCare = await collected(imran, ph.care, care.ace, 20, -22);

  // active reservations (owner inbox / status tracking)
  const pTomorrow = localAt(1, '18:00');
  await reservation({ patient: ayesha, pharmacy: ph.lazz, item: lazz.napa, qty: 10, status: 'Pending', pickupAt: pTomorrow, history: [{ status: 'Pending', by: ayesha._id, at: days(-0.1), note: 'Request sent' }] });
  await reservation({ patient: imran, pharmacy: ph.lazz, item: lazz.seclo, qty: 4, status: 'Pending', pickupAt: localAt(1, '17:00'), history: [{ status: 'Pending', by: imran._id, at: days(-0.2), note: 'Request sent' }] });
  await reservation({ patient: sadia, pharmacy: ph.lazz, item: lazz.monas, qty: 30, status: 'Pending', pickupAt: localAt(2, '11:00'), history: [{ status: 'Pending', by: sadia._id, at: days(-0.3), note: 'Request sent' }], extra: { note: 'I need the full strip' } });
  const pConf = localAt(2, '17:00');
  await reservation({ patient: ayesha, pharmacy: ph.tamanna, item: tam.seclo, qty: 14, status: 'Confirmed', pickupAt: pConf, history: [{ status: 'Pending', by: ayesha._id, at: days(-1), note: 'Request sent' }, { status: 'Confirmed', by: ph.tamanna.owner, at: days(-0.9), note: 'Availability confirmed' }] });
  const pReady = localAt(1, '16:30');
  await reservation({ patient: ayesha, pharmacy: ph.green, item: green.aceSyrup, qty: 1, status: 'ReadyForPickup', pickupAt: pReady, history: [{ status: 'Pending', by: ayesha._id, at: days(-1), note: 'Request sent' }, { status: 'Confirmed', by: ph.green.owner, at: days(-0.95), note: 'Availability confirmed' }, { status: 'ReadyForPickup', by: ph.green.owner, at: days(-0.5), note: 'Ready for pickup' }] });
  await reservation({ patient: ayesha, pharmacy: ph.care, item: care.fexo, qty: 10, status: 'Cancelled', pickupAt: localAt(-20, '10:00'), history: [{ status: 'Pending', by: ayesha._id, at: days(-21), note: 'Request sent' }, { status: 'Cancelled', by: ayesha._id, at: days(-20.5), note: 'Cancelled by patient' }] });
  await reservation({ patient: ayesha, pharmacy: ph.lazz, item: lazz.monas, qty: 30, status: 'Collected', pickupAt: localAt(-40, '19:00'), history: flow(ayesha, { _id: ph.lazz.owner }, localAt(-40, '19:00'), 'Collected'), extra: { collectedAt: localAt(-40, '19:00'), reviewed: true } });
  // overdue Confirmed reservation: demonstrates automatic expiry (node-cron / admin trigger)
  await reservation({ patient: imran, pharmacy: ph.tamanna, item: tam.fexo, qty: 5, status: 'Confirmed', pickupAt: localAt(-1, '10:00'), history: [{ status: 'Pending', by: imran._id, at: days(-2), note: 'Request sent' }, { status: 'Confirmed', by: ph.tamanna.owner, at: days(-1.9), note: 'Availability confirmed' }] });
  await M.Counter.create({ _id: 'reservation', seq });

  // ---------- reviews ----------
  const review = (patient, pharmacy, r, rating, text, daysAgo) => M.Review.create({ patient: patient._id, pharmacy: pharmacy._id, reservation: r._id, rating, text, createdAt: days(-daysAgo) });
  await review(ayesha, ph.lazz, rAyeshaNapa, 5, 'Had the medicine in stock exactly as listed. Quick and polite.', 2);
  await review(imran, ph.lazz, rImranLazz, 4, 'Good price. Waited 10 minutes at pickup.', 7);
  await review(sadia, ph.lazz, rSadiaLazz, 5, 'Reservation was ready before the deadline. Recommended.', 14);
  await review(imran, ph.lazz, rImranLazz2, 5, 'Staff confirmed my request within minutes.', 29);
  await review(ayesha, ph.green, rAyeshaGreen, 4, 'Open late at night, which helped a lot.', 7);
  await review(sadia, ph.green, rSadiaGreen, 5, 'Accurate stock information.', 19);
  await review(imran, ph.tamanna, rImranTam, 4, 'Cheapest price nearby.', 11);
  const lastLazz = await M.Reservation.findOne({ pharmacy: ph.lazz._id, status: 'Collected', reviewed: true, code: { $nin: [rAyeshaNapa.code, rImranLazz.code, rSadiaLazz.code, rImranLazz2.code] } });
  await review(ayesha, ph.lazz, lastLazz, 5, 'Always reliable.', 39);
  for (const p of Object.values(ph)) await recalculateRating(p._id);

  // ---------- complaints ----------
  let cseq = 200;
  const complaint = async (data) => {
    cseq += 1;
    return M.Complaint.create({ code: `C-${cseq}`, ...data });
  };
  await complaint({
    patient: ayesha._id, pharmacy: ph.green._id, targetType: 'reservation', reservation: rAyeshaGreen._id,
    issueType: 'Medicine listed but unavailable', status: 'UnderReview',
    description: 'The app showed 60 bottles in stock, but the pharmacy said it was sold out when I arrived.',
    pharmacyResponse: { message: 'Our stock was updated late because a shipment arrived that morning. We apologise and have fixed our update routine.', respondedAt: days(-3), respondedBy: owners.green._id },
    history: [{ action: 'filed', status: 'Open', by: ayesha._id, at: days(-5) }, { action: 'pharmacy_response', status: 'Open', by: owners.green._id, at: days(-3), note: 'Pharmacy responded' }, { action: 'status_change', status: 'UnderReview', by: admin._id, at: days(-2) }],
  });
  await complaint({
    patient: imran._id, pharmacy: ph.care._id, targetType: 'pharmacy', issueType: 'Overcharging', status: 'Open',
    description: 'I was charged Tk 12 per strip but the app listed Tk 8 per strip for the same medicine.',
    history: [{ action: 'filed', status: 'Open', by: imran._id, at: days(-1) }],
  });
  const resolvedCare = (patient, r, issueType, description, d) => complaint({
    patient: patient._id, pharmacy: ph.care._id, targetType: r ? 'reservation' : 'pharmacy', reservation: r ? r._id : undefined,
    issueType, description, status: 'Resolved', resolutionNote: 'Complaint upheld. Warning issued to the pharmacy.', reviewedBy: admin._id, resolvedAt: days(-d),
    history: [{ action: 'filed', status: 'Open', by: patient._id, at: days(-d - 3) }, { action: 'status_change', status: 'Resolved', by: admin._id, at: days(-d), note: 'Complaint upheld. Warning issued to the pharmacy.' }],
  });
  await resolvedCare(sadia, rSadiaCare, 'Overcharging', 'Charged Tk 12 per tablet instead of the listed Tk 9.', 6);
  await resolvedCare(imran, rImranCare, 'Medicine listed but unavailable', 'Listed 200 in stock but they had none when I arrived.', 12);
  await resolvedCare(ayesha, null, 'Rude behaviour', 'Staff refused to honour the reservation and were rude.', 20);
  await complaint({
    patient: sadia._id, pharmacy: ph.lazz._id, targetType: 'pharmacy', issueType: 'Rude behaviour', status: 'Dismissed',
    description: 'The pharmacist was impatient when I asked questions.',
    pharmacyResponse: { message: 'We reviewed CCTV and staff followed our service standards, but we apologise for the experience.', respondedAt: days(-9), respondedBy: owners.lazz._id },
    resolutionNote: 'No policy violation found.', reviewedBy: admin._id, resolvedAt: days(-8),
    history: [{ action: 'filed', status: 'Open', by: sadia._id, at: days(-10) }, { action: 'pharmacy_response', status: 'Open', by: owners.lazz._id, at: days(-9) }, { action: 'status_change', status: 'Dismissed', by: admin._id, at: days(-8), note: 'No policy violation found.' }],
  });
  await M.Counter.create({ _id: 'complaint', seq: cseq });

  // ---------- search log (popular searches) ----------
  await M.SearchLog.insertMany([['napa', 'Napa', 42], ['seclo 20', 'Seclo 20', 25], ['fexo 120', 'Fexo 120', 19], ['monas 10', 'Monas 10', 15], ['ostocal', 'Ostocal', 9], ['orsaline', 'Orsaline', 7]].map(([term, displayTerm, count]) => ({ term, displayTerm, count })));

  const counts = {};
  for (const [name, Model] of Object.entries(M)) counts[name] = await Model.countDocuments();
  console.log('Seed complete:', counts);
  console.log('\nDemo accounts (DEVELOPMENT ONLY):');
  console.table([
    { role: 'admin', email: 'admin@medfind.test', password: ADMIN_PASSWORD },
    { role: 'owner (Lazz Pharma, verified)', email: 'rahim.owner@medfind.test', password: DEMO_PASSWORD },
    { role: 'owner (Care Medicine Corner)', email: 'nusrat.owner@medfind.test', password: DEMO_PASSWORD },
    { role: 'owner (Green Life Pharmacy)', email: 'tanvir.owner@medfind.test', password: DEMO_PASSWORD },
    { role: 'owner (no pharmacy yet)', email: 'new.owner@medfind.test', password: DEMO_PASSWORD },
    { role: 'owner (Medicare Point, rejected)', email: 'sabbir.owner@medfind.test', password: DEMO_PASSWORD },
    { role: 'patient', email: 'ayesha@medfind.test', password: DEMO_PASSWORD },
    { role: 'patient', email: 'imran@medfind.test', password: DEMO_PASSWORD },
    { role: 'patient', email: 'sadia@medfind.test', password: DEMO_PASSWORD },
  ]);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB();
  process.exit(1);
});

module.exports = { oid };
