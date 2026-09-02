-- Project Directory Schema & Initial Seed Data
DROP TABLE IF EXISTS Project_Directory;

CREATE TABLE IF NOT EXISTS Project_Directory (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    client_name TEXT,
    location TEXT NOT NULL,
    project_manager TEXT,
    status TEXT DEFAULT 'Active',
    start_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Project_Directory (project_id, project_name, client_name, location, project_manager, status, start_date) VALUES 
('PRJ-001', 'North London Collegiate School - Solar PV', 'NLCS Singapore', 'Depot Road, Singapore', 'Vernon Tan', 'Active', '2026-05-01'),
('PRJ-002', 'Tuas Industrial Facility - Cat Ladder & Solar', 'Mansulita Pte Ltd', '9 Tuas View Lane, Singapore', 'Vernon Tan', 'Active', '2026-07-15'),
('PRJ-003', 'Commercial Block C - Waterproofing & PV', 'Unified Asia Solutions Pte. Ltd.', 'Ubi Avenue', 'TBD', 'Upcoming', '2026-10-01');
