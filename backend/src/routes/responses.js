const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/responses/my
 * Donor's own match notifications (pending/accepted/etc), newest first.
 */
router.get(
  '/my',
  requireAuth,
  requireRole('donor'),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('donor_responses')
      .select('*, blood_requests(*)')
      .eq('donor_id', req.profile.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ responses: data });
  })
);

/**
 * PATCH /api/responses/:id
 * Donor accepts or declines a matched request.
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('donor'),
  [
    param('id').isUUID(),
    body('status').isIn(['accepted', 'declined', 'completed']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { data: existing } = await supabaseAdmin
      .from('donor_responses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Response not found' });
    if (existing.donor_id !== req.profile.id) {
      return res.status(403).json({ error: 'This is not your response to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('donor_responses')
      .update({ status: req.body.status, responded_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // If donor accepted, bump the parent request to "matched" status
    if (req.body.status === 'accepted') {
      await supabaseAdmin
        .from('blood_requests')
        .update({ status: 'matched' })
        .eq('id', existing.request_id)
        .eq('status', 'open'); // don't downgrade if already further along
    }

    // If donation completed, log it to donation_history for future ranking
    if (req.body.status === 'completed') {
      await supabaseAdmin.from('donation_history').insert({
        donor_id: req.profile.id,
        request_id: existing.request_id,
        donation_date: new Date().toISOString().slice(0, 10),
      });
      await supabaseAdmin
        .from('profiles')
        .update({ last_donation_date: new Date().toISOString().slice(0, 10) })
        .eq('id', req.profile.id);
      await supabaseAdmin
        .from('blood_requests')
        .update({ status: 'fulfilled' })
        .eq('id', existing.request_id);
    }

    res.json({ response: data });
  })
);

module.exports = router;
