const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials.'
  );
  process.exit(1);
}

// Service-role client — used server-side only, bypasses RLS.
// The backend enforces its own authz checks (see middleware/auth.js)
// before touching the DB, since this key has full access.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabaseAdmin };
