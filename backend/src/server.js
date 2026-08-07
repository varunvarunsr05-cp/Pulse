require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const responseRoutes = require('./routes/responses');
const profileRoutes = require('./routes/profiles');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// ---- Security & parsing middleware ----
app.use(helmet()); // sets safe HTTP headers, mitigates common XSS vectors
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*', // tighten to your Vercel URL in production
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' })); // JSON body parsing; Supabase client handles SQL param binding (no raw SQL here → no injection surface)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- Rate limiting ----
// General API limiter
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);
// Stricter limiter on auth endpoints to slow brute-force attempts
app.use(
  '/api/auth/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later.' },
  })
);

// ---- Health check ----
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/profiles', profileRoutes);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---- Central error handler (must be last) ----
app.use(errorHandler);

// Only start listening when run directly (node src/server.js),
// not when imported by tests (require('./server')).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Blood Donor API running on port ${PORT}`);
  });
}

module.exports = app;
