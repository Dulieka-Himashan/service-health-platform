import { useEffect, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/services`)
      .then((res) => res.json())
      .then(setServices)
      .catch(() => setError('Could not load services'));

    fetch(`${API_URL}/incidents`)
      .then((res) => res.json())
      .then(setIncidents)
      .catch(() => setError('Could not load incidents'));
  }, []);

  return (
    <div className="container">
      <h1>Service Health & Incident Dashboard</h1>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>Services</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Environment</th>
              <th>Status</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.environment}</td>
                <td className={`status status-${(s.status || '').toLowerCase()}`}>
                  {s.status}
                </td>
                <td>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.url}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Incidents</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Service</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td>{i.service_name || '—'}</td>
                <td>{i.severity}</td>
                <td>{i.status}</td>
                <td>{new Date(i.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
