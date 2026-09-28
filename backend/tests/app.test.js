const request = require('supertest');

jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const app = require('../app');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /health', () => {
  test('returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'healthy' });
  });
});

describe('GET /services', () => {
  test('returns the list of services', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Payment API' }] });
    const res = await request(app).get('/services');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Payment API');
  });

  test('returns 500 when the database fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).get('/services');
    expect(res.status).toBe(500);
  });
});

describe('POST /services', () => {
  test('returns 400 when name and url are missing', async () => {
    const res = await request(app).post('/services').send({ description: 'x' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('creates a service and returns 201', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Website', url: 'https://example.com' }] });
    const res = await request(app)
      .post('/services')
      .send({ name: 'Website', url: 'https://example.com' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(2);
  });
});

describe('GET /incidents', () => {
  test('returns incidents with service names', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Outage', service_name: 'Payment API' }],
    });
    const res = await request(app).get('/incidents');
    expect(res.status).toBe(200);
    expect(res.body[0].service_name).toBe('Payment API');
  });
});

describe('POST /incidents', () => {
  test('returns 400 when service_id is missing', async () => {
    const res = await request(app).post('/incidents').send({ title: 'No service' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 404 when the service does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/incidents')
      .send({ service_id: 999, title: 'Ghost incident' });
    expect(res.status).toBe(404);
  });

  test('creates an incident and returns 201', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 7, service_id: 1, title: 'Outage', status: 'OPEN' }] });
    const res = await request(app)
      .post('/incidents')
      .send({ service_id: 1, title: 'Outage' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('OPEN');
  });
});
