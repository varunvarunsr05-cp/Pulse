const { supabaseAdmin } = require('../config/supabase');

/**
 * Verifies the Supabase JWT sent in the Authorization header,
 * attaches the authenticated user + their profile (with role) to req.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = data.user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ error: 'Authentication check failed' });
  }
}

/**
 * Restricts a route to specific roles. Use after requireAuth.
 * e.g. router.post('/requests', requireAuth, requireRole('hospital'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.profile || !allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({
        error: `This action requires role: ${allowedRoles.join(' or ')}`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
