/** Common (shared by every member's server): authentication and in-app notifications. Not an assessed feature. */
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const v = require('../validators/auth.validators');

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

router.post('/auth/register', authLimiter, validate(v.register), ctrl.register);
router.post('/auth/login', authLimiter, validate(v.login), ctrl.login);
router.get('/auth/me', authenticate, ctrl.me);
router.get('/notifications', authenticate, ctrl.notifications);

module.exports = router;
