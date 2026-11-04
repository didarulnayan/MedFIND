/** Member 4 - Feature 1: Pharmacy Verification & Reviews */
const service = require('../services/verification.service');
const { ok, created, getPagination } = require('../utils/helpers');

async function registerPharmacy(req, res) {
  created(res, await service.registerPharmacy(req.user, req.body, req.file), 'Pharmacy registered; verification is Pending');
}

async function myVerification(req, res) {
  ok(res, await service.myVerification(req.user), 'Verification status');
}

async function resubmitLicence(req, res) {
  ok(res, await service.resubmitLicence(req.user, req.body, req.file), 'Licence resubmitted; verification is Pending');
}

async function adminList(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.adminListPharmacies({ status: q.status, search: q.search, ...getPagination(q) }), 'Pharmacies');
}

async function adminDetail(req, res) {
  ok(res, await service.adminPharmacyDetail(req.params.id), 'Pharmacy verification details');
}

async function decide(req, res) {
  ok(res, await service.decideVerification(req.user, req.params.id, req.body), 'Verification decision saved');
}

async function publicProfile(req, res) {
  ok(res, await service.publicProfile(req.params.id), 'Pharmacy profile');
}

async function listReviews(req, res) {
  ok(res, await service.listReviews(req.params.id, getPagination(req.validatedQuery)), 'Reviews');
}

async function reviewableReservations(req, res) {
  ok(res, await service.reviewableReservations(req.user, req.params.id), 'Reservations you can review');
}

async function createReview(req, res) {
  created(res, await service.createReview(req.user, req.params.id, req.body), 'Review submitted');
}

module.exports = { registerPharmacy, myVerification, resubmitLicence, adminList, adminDetail, decide, publicProfile, listReviews, reviewableReservations, createReview };
