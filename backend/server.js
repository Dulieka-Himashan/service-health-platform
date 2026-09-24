const express = require('express');
const pool = require('./db');
const app = express();
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
