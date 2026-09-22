-- Project Directory Schema
CREATE TABLE IF NOT EXISTS Project_Directory (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    client_name TEXT,
    location TEXT NOT NULL,
    project_manager TEXT,
    status TEXT DEFAULT 'Active',
    start_date DATE,
    wsho_name TEXT,
    wsho_email TEXT,
    wsho_phone TEXT,
    pm_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
