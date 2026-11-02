const pool = require('../db');

afterAll(async () => {
  await pool.end();
});

test('pool has an error listener so a dropped connection cannot crash the process', () => {
  expect(pool.listenerCount('error')).toBeGreaterThan(0);
});
