const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/helpers');
const { listForUser } = require('../services/notification.service');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function register(req, res) {
  if (await User.exists({ email: req.body.email.toLowerCase() })) throw ApiError.conflict('An account with this email already exists');
  const user = await User.create(req.body);
  created(res, { user, token: signToken(user) }, 'Account created');
}

async function login(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');
  ok(res, { user, token: signToken(user) }, 'Logged in');
}

async function me(req, res) {
  ok(res, { user: req.user });
}

async function notifications(req, res) {
  ok(res, { notifications: await listForUser(req.user._id, { unreadOnly: req.query.unread === 'true' }) });
}

module.exports = { register, login, me, notifications, signToken };
