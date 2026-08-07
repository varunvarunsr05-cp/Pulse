const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { rankDonors, distanceKm } = require('../services/donorRanking');

const router = express.Router();

/**
 * POST /api/requests
 * Hospital creates an emergency blood request.
 */
router.post(
  '/',
  requireAuth,
  requireRole('hospital'),
  [
    body('bloodGroupNeeded').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('unitsNeeded').isInt({ min: 1, max: 50 }),
    body('urgency').isIn(['critical', 'high', 'medium', 'low']),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('patientCondition').optional().trim().isLength({ max: 500 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      bloodGroupNeeded,
      unitsNeeded,
      urgency,
      patientCondition,
      latitude,
      longitude,
      hospitalAddress,
      notes,
      neededBy,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('blood_requests')
      .insert({
        hospital_id: req.profile.id,
        blood_group_needed: bloodGroupNeeded,
        units_needed: unitsNeeded,
        urgency,
        patient_condition: patientCondition,
        latitude,
        longitude,
        hospital_address: hospitalAddress || req.profile.address,
        notes,
        needed_by: neededBy || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ request: data });
  })
);

/**
 * GET /api/requests
 * List requests. Donors see open requests (optionally filtered by
 * distance/blood group); hospitals see their own requests.
 */
router.get(
  '/',
  requireAuth,
  [
    query('status').optional().isIn(['open', 'matched', 'fulfilled', 'cancelled', 'expired']),
    query('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  ],
  asyncHandler(async (req, res) => {
    let q = supabaseAdmin.from('blood_requests').select('*').order('created_at', { ascending: false });

    if (req.profile.role === 'hospital') {
      q = q.eq('hospital_id', req.profile.id);
    } else if (req.query.status) {
      q = q.eq('status', req.query.status);
    } else {
      q = q.eq('status', 'open');
    }

    if (req.query.bloodGroup) {
      q = q.eq('blood_group_needed', req.query.bloodGroup);
    }

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });

    // For donors, attach distance so the list can be sorted/filtered client-side
    if (req.profile.role === 'donor' && req.profile.latitude != null) {
      const withDistance = data.map((r) => ({
        ...r,
        distanceKm:
          r.latitude != null
            ? Math.round(
                distanceKm(req.profile.latitude, req.profile.longitude, r.latitude, r.longitude) * 10
              ) / 10
            : null,
      }));
      return res.json({ requests: withDistance });
    }

    res.json({ requests: data });
  })
);

/**
 * GET /api/requests/:id
 */
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid request ID' });

    const { data, error } = await supabaseAdmin
      .from('blood_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: data });
  })
);

/**
 * GET /api/requests/:id/matches
 * THE AI MATCHING ENDPOINT — ranks eligible donors for this request.
 * Only the owning hospital can view matches for their request.
 */
router.get(
  '/:id/matches',
  requireAuth,
  requireRole('hospital'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid request ID' });

    const { data: request, error: reqError } = await supabaseAdmin
      .from('blood_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (reqError || !request) return res.status(404).json({ error: 'Request not found' });
    if (request.hospital_id !== req.profile.id) {
      return res.status(403).json({ error: 'You do not own this request' });
    }

    // Pull candidate donors: role=donor, has location set
    const { data: donors, error: donorError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'donor')
      .not('latitude', 'is', null)
      .not('blood_group', 'is', null);

    if (donorError) return res.status(400).json({ error: donorError.message });

    // Pull donation history for reliability scoring
    const donorIds = donors.map((d) => d.id);
    let historyByDonor = {};
    if (donorIds.length > 0) {
      const { data: history } = await supabaseAdmin
        .from('donation_history')
        .select('*')
        .in('donor_id', donorIds);

      historyByDonor = (history || []).reduce((acc, h) => {
        (acc[h.donor_id] = acc[h.donor_id] || []).push(h);
        return acc;
      }, {});
    }

    const ranked = rankDonors(request, donors, historyByDonor);

    // Persist top eligible matches as pending donor_responses so they
    // show up in donor dashboards and can be tracked.
    const topMatches = ranked.filter((r) => r.eligible).slice(0, 10);
    if (topMatches.length > 0) {
      const rows = topMatches.map((m) => ({
        request_id: request.id,
        donor_id: m.donorId,
        status: 'pending',
        ai_match_score: m.totalScore,
        ai_match_reasoning: m.breakdown,
      }));
      await supabaseAdmin
        .from('donor_responses')
        .upsert(rows, { onConflict: 'request_id,donor_id', ignoreDuplicates: true });
    }

    res.json({
      request,
      totalCandidates: donors.length,
      eligibleCount: ranked.filter((r) => r.eligible).length,
      matches: ranked,
    });
  })
);

/**
 * PATCH /api/requests/:id/status
 * Hospital updates request status (e.g. fulfilled, cancelled).
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('hospital'),
  [
    param('id').isUUID(),
    body('status').isIn(['open', 'matched', 'fulfilled', 'cancelled', 'expired']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { data: existing } = await supabaseAdmin
      .from('blood_requests')
      .select('hospital_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Request not found' });
    if (existing.hospital_id !== req.profile.id) {
      return res.status(403).json({ error: 'You do not own this request' });
    }

    const { data, error } = await supabaseAdmin
      .from('blood_requests')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ request: data });
  })
);

module.exports = router;
