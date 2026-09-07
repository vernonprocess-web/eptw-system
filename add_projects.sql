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
    wsho_name TEXT,
    wsho_email TEXT,
    wsho_phone TEXT,
    pm_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Project_Directory (project_id, project_name, client_name, location, project_manager, status, start_date, wsho_name, wsho_email, wsho_phone, pm_email) VALUES 
('PRJ-001', 'North London Collegiate School - Solar PV', 'NLCS Singapore', 'Depot Road, Singapore', 'Vernon Tan', 'Active', '2026-05-01', 'Alex Tan (WSHO)', 'alex.tan@safety-wsh.sg', '+65 9123 4567', 'vernon.tan@company.com'),
('PRJ-002', 'Tuas Industrial Facility - Cat Ladder & Solar', 'Mansulita Pte Ltd', '9 Tuas View Lane, Singapore', 'Vernon Tan', 'Active', '2026-07-15', 'David Lim (WSHO)', 'david.lim@safety-wsh.sg', '+65 9876 5432', 'vernon.tan@company.com'),
('PRJ-003', 'Commercial Block C - Waterproofing & PV', 'Unified Asia Solutions Pte. Ltd.', 'Ubi Avenue', 'TBD', 'Upcoming', '2026-10-01', 'Safety Assessor', 'safety@company.com', '+65 9000 0000', 'vernon.tan@company.com');
