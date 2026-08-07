const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * PATCH /api/profiles/me
 * Update own profile — availability toggle, location, contact info, etc.
 */
router.patch(
  '/me',
  requireAuth,
  [
    body('isAvailable').optional().isBoolean(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('weightKg').optional().isFloat({ min: 30, max: 250 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const updates = {};
    const fieldMap = {
      isAvailable: 'is_available',
      latitude: 'latitude',
      longitude: 'longitude',
      phone: 'phone',
      address: 'address',
      city: 'city',
      weightKg: 'weight_kg',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) updates[col] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.profile.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ profile: data });
  })
);

/**
 * GET /api/profiles/donor-stats
 * Simple analytics for a donor's own dashboard.
 */
router.get(
  '/donor-stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: history, error } = await supabaseAdmin
      .from('donation_history')
      .select('*')
      .eq('donor_id', req.profile.id)
      .order('donation_date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    const totalDonations = history.length;
    const totalUnits = history.reduce((sum, h) => sum + (h.units_donated || 1), 0);
    const livesImpacted = totalUnits * 3; // standard estimate: 1 donation can help ~3 patients

    res.json({
      totalDonations,
      totalUnits,
      livesImpacted,
      lastDonation: history[0]?.donation_date || null,
      history,
    });
  })
);

module.exports = router;
