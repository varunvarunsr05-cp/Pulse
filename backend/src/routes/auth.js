const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a Supabase auth user + matching profile row in one step.
 * Frontend calls this instead of supabase.auth.signUp directly so
 * the profile row (role, blood group, location, etc.) is created atomically.
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('role').isIn(['donor', 'hospital']).withMessage('Role must be donor or hospital'),
    body('phone').optional().trim(),
    body('bloodGroup')
      .if(body('role').equals('donor'))
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Valid blood group required for donors'),
    body('hospitalName').if(body('role').equals('hospital')).trim().notEmpty(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      email,
      password,
      fullName,
      role,
      phone,
      bloodGroup,
      hospitalName,
      licenseNumber,
      dateOfBirth,
      weightKg,
      latitude,
      longitude,
      address,
      city,
    } = req.body;

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for hackathon demo speed
    });

    if (authError) {
      const status = authError.status === 422 ? 409 : 400;
      return res
        .status(status)
        .json({ error: authError.message || 'Could not create account' });
    }

    // 2. Create the profile row
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        phone,
        blood_group: role === 'donor' ? bloodGroup : null,
        hospital_name: role === 'hospital' ? hospitalName : null,
        license_number: role === 'hospital' ? licenseNumber : null,
        date_of_birth: dateOfBirth || null,
        weight_kg: weightKg || null,
        latitude,
        longitude,
        address,
        city,
      })
      .select()
      .single();

    if (profileError) {
      // Roll back the auth user so we don't leave orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: 'Could not create profile: ' + profileError.message });
    }

    res.status(201).json({ message: 'Account created', profile });
  })
);

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ profile: req.profile });
  })
);

module.exports = router;
