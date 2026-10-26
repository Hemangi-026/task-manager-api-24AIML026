/**
 * Practical 12 — CI/CD Automated Tests
 *
 * These tests run automatically in GitHub Actions on every push to main.
 * They do NOT require a running MongoDB instance — they test the HTTP layer only.
 *
 * Test strategy:
 *  - Public endpoints (no auth needed) → test directly with supertest
 *  - Protected endpoints → test that they return 401 without a token
 *    (proves auth middleware is wired correctly without needing a real DB)
 */
const request = require('supertest');
const app     = require('../server');

// ============================================================
// 1. Health / reachability tests (no auth needed)
// ============================================================
describe('Server is reachable', () => {
  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================
// 2. Auth endpoint tests (public — no token needed)
// ============================================================
describe('POST /register — input validation', () => {
  test('Returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/register')
      .send({})                        // no name, email, password, role
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(400);
  });

  test('Returns 400 when only email is provided', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'test@test.com' })
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /login — input validation', () => {
  test('Returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/login')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /forgot-password — input validation', () => {
  test('Returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(400);
  });
});

// ============================================================
// 3. Protected endpoint tests — must return 401 without token
// ============================================================
describe('Protected routes return 401 without token', () => {
  test('GET /tasks → 401', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(200); // DELIBERATELY BROKEN — should be 401
  });

  test('POST /tasks → 401', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', priority: 'low' })
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(401);
  });

  test('GET /me → 401', async () => {
    const res = await request(app).get('/me');
    expect(res.statusCode).toBe(401);
  });

  test('GET /cache/stats → 401', async () => {
    const res = await request(app).get('/cache/stats');
    expect(res.statusCode).toBe(401);
  });

  test('GET /notifications/logs → 401', async () => {
    const res = await request(app).get('/notifications/logs');
    expect(res.statusCode).toBe(401);
  });
});
