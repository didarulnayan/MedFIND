/** Member 2 - Feature 2: Reservation Status Tracking */
const service = require('../services/reservationStatus.service');
const { ok, getPagination } = require('../utils/helpers');

async function myReservations(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.myReservations(req.user, { tab: q.tab, ...getPagination(q) }), 'My reservations');
}

async function getReservation(req, res) {
  ok(res, await service.getReservation(req.user, req.params.id), 'Reservation details');
}

async function cancelReservation(req, res) {
  ok(res, await service.cancelReservation(req.user, req.params.id, req.body.reason), 'Reservation cancelled');
}

async function ownerInbox(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.ownerInbox(req.pharmacy, { status: q.status, ...getPagination(q) }), 'Reservation requests');
}

async function advanceStatus(req, res) {
  ok(res, await service.advanceStatus(req.user, req.pharmacy, req.params.id, req.body), 'Reservation status updated');
}

async function rejectReservation(req, res) {
  ok(res, await service.rejectReservation(req.user, req.pharmacy, req.params.id, req.body), 'Reservation rejected');
}

async function expireOverdue(_req, res) {
  ok(res, await service.expireOverdueReservations(), 'Overdue reservations expired');
}

module.exports = { myReservations, getReservation, cancelReservation, ownerInbox, advanceStatus, rejectReservation, expireOverdue };
