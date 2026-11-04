const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const ApiError = require('../utils/ApiError');

/** Verifies the "Authorization: Bearer <JWT>" header and attaches req.user. */
async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Missing or malformed Authorization header (expected: Bearer <token>)');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
  req.user = user;
  next();
}

/** Role-based access: authorize('admin'), authorize('owner', 'admin') ... */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`This action requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}

/** For pharmacy-owner routes: loads the pharmacy that belongs to the logged-in owner into req.pharmacy. */
async function loadOwnerPharmacy(req, _res, next) {
  const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
  if (!pharmacy) throw ApiError.notFound('You have not registered a pharmacy yet');
  req.pharmacy = pharmacy;
  next();
}

module.exports = { authenticate, authorize, loadOwnerPharmacy };
