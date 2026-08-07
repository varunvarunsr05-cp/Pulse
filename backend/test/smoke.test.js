process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/server');

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('GET /api/unknown returns 404 with error shape', async () => {
  const res = await request(app).get('/api/unknown');
  assert.strictEqual(res.status, 404);
  assert.ok(res.body.error);
});

test('GET /api/auth/me without token returns 401', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/register with invalid email/short password returns 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'notanemail', password: 'short' });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.details && res.body.details.length > 0);
});

test('POST /api/requests without auth returns 401', async () => {
  const res = await request(app)
    .post('/api/requests')
    .send({ bloodGroupNeeded: 'A+', unitsNeeded: 2, urgency: 'high', latitude: 12.9, longitude: 77.6 });
  assert.strictEqual(res.status, 401);
});

test('rate limiter headers present on API routes', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.ok(res.headers['ratelimit-limit'] !== undefined || res.headers['x-ratelimit-limit'] !== undefined);
});
