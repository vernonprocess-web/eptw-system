-- Toolbox Meetings (TBM) & Daily Safety Briefing Ledger Schema Migration
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS TBM_Records (
    tbm_id TEXT PRIMARY KEY,                       -- e.g., 'TBM-2026-001'
    ptw_id TEXT NOT NULL REFERENCES PTW_Records(ptw_id),
    project_id TEXT NOT NULL REFERENCES Project_Directory(project_id),
    supervisor_name TEXT NOT NULL,
    supervisor_role TEXT DEFAULT 'Site Supervisor',
    supervisor_phone TEXT,
    supervisor_sig TEXT,                           -- Supervisor signature base64
    conducted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'PENDING_BRIEFING' CHECK(status IN ('PENDING_BRIEFING', 'COMPLETED', 'CLOSED')),
    hazard_summary TEXT NOT NULL,                  -- Dynamic task-specific hazards & controls from PTW/RAMS
    attendance_count INTEGER DEFAULT 0,
    worker_signatures JSON DEFAULT '[]',           -- Array of { worker_id, full_name, ic_wp_fin_last4, trade, signature_base64, signed_at }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexing for High-Density Filtering & Range Scans
CREATE INDEX IF NOT EXISTS idx_tbm_site_date ON TBM_Records(project_id, conducted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tbm_conducted_at ON TBM_Records(conducted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tbm_ptw ON TBM_Records(ptw_id);

-- Seed Sample TBM Records linked to existing PTW-2026-001 and PTW-2026-002
INSERT OR IGNORE INTO TBM_Records (
    tbm_id, ptw_id, project_id, supervisor_name, supervisor_role, supervisor_phone,
    conducted_at, status, hazard_summary, attendance_count, worker_signatures
) VALUES (
    'TBM-2026-001',
    'PTW-2026-001',
    'PRJ-001',
    'Alex Tan',
    'Site Supervisor',
    '+65 9123 4567',
    '2026-09-22 07:45:00',
    'COMPLETED',
    '• Working at Height (>2m): Harness & double lanyard mandatory. Verify life line anchor points before mounting roof.\n• Falling Objects: Hard hats required at all times. Establish exclusion zone below work area.\n• Solar PV Lifting: Crane Outrigger pads must be fully extended on solid ground.',
    3,
    '[{"worker_id":"WRK-80727","full_name":"BABU MD NAIM","ic_wp_fin_last4":"****4785N","trade":"Rigging & Lifting","signed_at":"2026-09-22 07:42:15","signature_base64":""},{"worker_id":"WRK-80728","full_name":"CHANDRAN KUMAR","ic_wp_fin_last4":"****1234S","trade":"Scaffolder","signed_at":"2026-09-22 07:43:00","signature_base64":""},{"worker_id":"WRK-80729","full_name":"TAN AH KOW","ic_wp_fin_last4":"****5678G","trade":"Electrician","signed_at":"2026-09-22 07:44:10","signature_base64":""}]'
), (
    'TBM-2026-002',
    'PTW-2026-002',
    'PRJ-002',
    'David Wong',
    'Safety Officer (WSHO)',
    '+65 9456 7890',
    '2026-09-22 08:15:00',
    'PENDING_BRIEFING',
    '• Confined Space Entry: Gas detector calibration check (O2 > 19.5%, H2S < 10ppm, CO < 25ppm). Standby person stationed outside at all times with air horn.\n• Heat Stress & Ventilation: Continuous mechanical ventilation forced air blower active.',
    0,
    '[]'
);

PRAGMA foreign_keys = ON;
