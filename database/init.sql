-- Services table: stores registered services and their current status
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50),
    status VARCHAR(20) DEFAULT 'UNKNOWN'
);

-- Incidents table: stores incident records, linked to the affected service
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20),
    status VARCHAR(20) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT NOW()
);
