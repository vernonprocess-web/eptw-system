-- ePTW Transaction Engine Schema & Initial Seed Permits
DROP TABLE IF EXISTS PTW_Records;

CREATE TABLE IF NOT EXISTS PTW_Records (
    ptw_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    ptw_type TEXT DEFAULT 'Work at Height',
    work_description TEXT NOT NULL,
    assigned_workers_json TEXT, 
    selected_rams_json TEXT, 
    status TEXT DEFAULT 'Draft', 
    valid_until DATETIME,
    applicant_signature TEXT,
    safety_signature TEXT,
    pm_signature TEXT,
    safety_vetted_at DATETIME,
    pm_approved_at DATETIME,
    closed_at DATETIME,
    rejection_reason TEXT,
    applicant_email TEXT,
    assigned_wsho_name TEXT,
    assigned_wsho_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES Project_Directory(project_id) ON DELETE CASCADE
);

-- Initial seed permit records linking Projects, Workers, and RAMS items
INSERT INTO PTW_Records (ptw_id, project_id, ptw_type, work_description, assigned_workers_json, selected_rams_json, status, valid_until) VALUES 
(
  'PTW-2026-001',
  'PRJ-002',
  'Work at Height',
  'Rooftop Cat Ladder Assembly & Solar PV Mounting Frame Fixing',
  '["WRK-1002", "WRK-80727"]',
  '[1, 3]',
  'Active',
  '2026-09-02 18:00:00'
),
(
  'PTW-2026-002',
  'PRJ-001',
  'Electrical Work',
  'Main Switchboard (MSB) Route Containment & Inverter Cable Termination',
  '["WRK-1001"]',
  '[2]',
  'Active',
  '2026-09-02 18:00:00'
),
(
  'PTW-2026-003',
  'PRJ-003',
  'Hot Work',
  'Structural Steel Support Welding & Perimeter Guardrail Assembly',
  '["WRK-1003"]',
  '[4]',
  'Draft',
  '2026-10-01 18:00:00'
);
