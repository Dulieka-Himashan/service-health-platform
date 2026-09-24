const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'service_health',
  password: 'devpassword123',
  port: 5432,
});

module.exports = pool;
