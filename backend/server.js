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
  try {
    const { name, url, description, environment, status } = req.body;
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
