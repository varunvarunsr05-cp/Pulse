/**
 * Catch-all error handler. Any route that calls next(err) or throws
 * inside an async wrapper lands here — keeps error shape consistent
 * across the whole API instead of leaking stack traces to clients.
 */
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} -`, err);

  const status = err.status || 500;
  const message =
    status === 500 ? 'Internal server error' : err.message || 'Something went wrong';

  res.status(status).json({ error: message });
}

/**
 * Wraps async route handlers so thrown errors / rejected promises
 * are forwarded to errorHandler instead of crashing the process.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
