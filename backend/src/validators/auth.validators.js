const { z } = require('./common');

const register = z.object({
  name: z.string().trim().min(2, 'name must have at least 2 characters').max(100),
  email: z.string().trim().email('email must be a valid email address'),
  phone: z.string().trim().regex(/^01\d{9}$/, 'phone must be an 11-digit Bangladeshi mobile number (01XXXXXXXXX)').optional(),
  password: z.string().min(8, 'password must have at least 8 characters').max(72),
  // admins are never self-registered
  role: z.enum(['patient', 'owner']).default('patient'),
});

const login = z.object({
  email: z.string().trim().email('email must be a valid email address'),
  password: z.string().min(1, 'password is required'),
});

module.exports = { register, login };
