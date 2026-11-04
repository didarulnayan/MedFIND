/** Member 4 - Feature 2: Complaints & Disputes */
const service = require('../services/complaint.service');
const { ok, created, getPagination } = require('../utils/helpers');

async function fileComplaint(req, res) {
  created(res, await service.fileComplaint(req.user, req.body, req.files || []), 'Complaint submitted');
}

async function myComplaints(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.myComplaints(req.user, { tab: q.tab, ...getPagination(q) }), 'My complaints');
}

async function getComplaint(req, res) {
  ok(res, await service.getComplaint(req.user, req.params.id), 'Complaint details');
}

async function ownerComplaints(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.ownerComplaints(req.pharmacy, { status: q.status, ...getPagination(q) }), 'Complaints about your pharmacy');
}

async function respond(req, res) {
  ok(res, await service.respondToComplaint(req.user, req.pharmacy, req.params.id, req.body), 'Response sent');
}

async function adminComplaints(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.adminComplaints({ status: q.status, ...getPagination(q) }), 'Complaints');
}

async function updateStatus(req, res) {
  ok(res, await service.updateComplaintStatus(req.user, req.params.id, req.body), 'Complaint status updated');
}

async function suspend(req, res) {
  ok(res, await service.suspendPharmacy(req.user, req.params.id, req.body), 'Pharmacy suspended');
}

async function reinstate(req, res) {
  ok(res, await service.reinstatePharmacy(req.user, req.params.id, req.body), 'Pharmacy reinstated');
}

module.exports = { fileComplaint, myComplaints, getComplaint, ownerComplaints, respond, adminComplaints, updateStatus, suspend, reinstate };
