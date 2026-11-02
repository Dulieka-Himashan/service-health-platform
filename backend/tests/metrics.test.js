const request = require('supertest');

jest.mock('../db', () => ({ query: jest.fn() }));

const app = require('../app');

test('GET /metrics exposes Prometheus metrics', async () => {
  await request(app).get('/health');
  const res = await request(app).get('/metrics');
  expect(res.status).toBe(200);
  expect(res.text).toContain('http_request_duration_seconds');
});
