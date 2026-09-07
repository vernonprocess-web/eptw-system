-- PRAGMA foreign_keys = OFF; to ensure clean execution during migration
PRAGMA foreign_keys = OFF;

-- Create Users Directory Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT CHECK(role IN ('SAFETY_ASSESSOR', 'WSHO', 'PROJECT_MANAGER', 'ADMIN', 'WORKER')) NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed System Users (Project Managers, WSHOs, Safety Assessors)
INSERT OR IGNORE INTO users (id, name, email, phone, role, status) VALUES
('usr_pm_001', 'Alex Tan', 'vernon.process@gmail.com', '+65 9123 4567', 'PROJECT_MANAGER', 'ACTIVE'),
('usr_pm_002', 'Sarah Lim', 'sarah.lim@unified-as.com', '+65 9234 5678', 'PROJECT_MANAGER', 'ACTIVE'),
('usr_pm_003', 'Michael Chen', 'michael.chen@unified-as.com', '+65 9345 6789', 'PROJECT_MANAGER', 'ACTIVE'),
('usr_wsho_001', 'David Wong', 'david.wong@unified-as.com', '+65 9456 7890', 'WSHO', 'ACTIVE'),
('usr_sa_001', 'John Doe', 'john.doe@unified-as.com', '+65 9567 8901', 'SAFETY_ASSESSOR', 'ACTIVE');

-- Add Foreign Key & Idempotency Columns via non-destructive ALTER TABLE
ALTER TABLE Project_Directory ADD COLUMN pm_user_id TEXT REFERENCES users(id);
ALTER TABLE Project_Directory ADD COLUMN wsho_user_id TEXT REFERENCES users(id);

ALTER TABLE PTW_Records ADD COLUMN client_id TEXT;
ALTER TABLE PTW_Records ADD COLUMN action_transaction_id TEXT;
ALTER TABLE PTW_Records ADD COLUMN pm_user_id TEXT REFERENCES users(id);
ALTER TABLE PTW_Records ADD COLUMN assessor_user_id TEXT REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ptw_client_id ON PTW_Records(client_id);

-- Update default project PM user IDs
UPDATE Project_Directory SET pm_user_id = 'usr_pm_001', wsho_user_id = 'usr_wsho_001' WHERE project_id IN ('PRJ-001', 'PRJ-002');
UPDATE Project_Directory SET pm_user_id = 'usr_pm_002', wsho_user_id = 'usr_wsho_001' WHERE project_id = 'PRJ-003';

PRAGMA foreign_keys = ON;
