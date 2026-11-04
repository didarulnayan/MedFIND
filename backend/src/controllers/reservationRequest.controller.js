/** Member 2 - Feature 1: Medicine Details & Reservation Request */
const service = require('../services/reservationRequest.service');
const { ok, created } = require('../utils/helpers');

async function medicineDetails(req, res) {
  ok(res, await service.getMedicineDetails(req.params.medicineId, req.validatedQuery), 'Medicine details');
}

async function availability(req, res) {
  const { medicineId, pharmacyId } = req.params;
  ok(res, await service.getAvailability(medicineId, pharmacyId, req.validatedQuery.quantity), 'Pharmacy availability');
}

async function createReservation(req, res) {
  const data = await service.createReservation(req.user, req.body, req.file);
  created(res, data, 'Reservation request sent');
}

async function uploadPrescription(req, res) {
  ok(res, await service.uploadPrescription(req.user, req.params.id, req.file), 'Prescription uploaded');
}

module.exports = { medicineDetails, availability, createReservation, uploadPrescription };
