const express = require('express');
const pool = require('./db');
const app = express();
app.use(express.json());
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Service Health & Incident Dashboard - Backend is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/services', async (req, res) => {
  const { name, url, description, environment, status } = req.body || {};

  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO services (name, url, description, environment, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, url, description, environment, status || 'UNKNOWN']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.get('/incidents', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT incidents.id, incidents.title, incidents.description,
              incidents.severity, incidents.status, incidents.created_at,
              services.name AS service_name
       FROM incidents
       LEFT JOIN services ON incidents.service_id = services.id
       ORDER BY incidents.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.post('/incidents', async (req, res) => {
  const { service_id, title, description, severity, status } = req.body || {};

  if (!title || !Number.isInteger(service_id)) {
    return res.status(400).json({ error: 'title and a numeric service_id are required' });
  }

  try {
    const service = await pool.query('SELECT id FROM services WHERE id = $1', [service_id]);
    if (service.rows.length === 0) {
      return res.status(404).json({ error: 'service not found' });
    }

    const result = await pool.query(
      'INSERT INTO incidents (service_id, title, description, severity, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [service_id, title, description, severity, status || 'OPEN']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
