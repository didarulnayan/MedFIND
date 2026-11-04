/**
 * Feature registry: which routers belong to which member.
 * Each member's server mounts ONLY the common routes plus that member's two features,
 * so every member can run and demonstrate their own APIs independently on their own port.
 */
const FEATURES = {
  catalog: { member: 1, title: 'Medicine Catalog Management', router: () => require('./catalog.routes') },
  stock: { member: 1, title: 'Stock & Expiry Tracking', router: () => require('./stock.routes') },
  reservationRequest: { member: 2, title: 'Medicine Details & Reservation Request', router: () => require('./reservationRequest.routes') },
  reservationStatus: { member: 2, title: 'Reservation Status Tracking', router: () => require('./reservationStatus.routes') },
  search: { member: 3, title: 'Medicine Search & Filter', router: () => require('./search.routes') },
  nearby: { member: 3, title: 'Nearby Pharmacies & Sorting', router: () => require('./nearby.routes') },
  verification: { member: 4, title: 'Pharmacy Verification & Reviews', router: () => require('./verification.routes') },
  complaints: { member: 4, title: 'Complaints & Disputes', router: () => require('./complaint.routes') },
};

const MEMBERS = {
  1: { name: 'Audrija Chowdhury', studentId: '22299421', portKey: 'member1', features: ['catalog', 'stock'], jobs: ['stockRefresh'] },
  2: { name: 'Abdullah Al Zahur Rafi', studentId: '22299050', portKey: 'member2', features: ['reservationRequest', 'reservationStatus'], jobs: ['reservationExpiry'] },
  3: { name: 'Abdullah Al Muqit', studentId: '22201783', portKey: 'member3', features: ['search', 'nearby'], jobs: [] },
  4: { name: 'Md Didarul Islam Nayan', studentId: '23301274', portKey: 'member4', features: ['verification', 'complaints'], jobs: [] },
};

module.exports = { FEATURES, MEMBERS };
