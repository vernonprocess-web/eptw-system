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
    worker_concerns_raised TEXT DEFAULT 'Nil / No concerns raised', -- 2-Way communication & worker safety concerns
    attendance_count INTEGER DEFAULT 0,
    worker_signatures JSON DEFAULT '[]',           -- Array of { worker_id, full_name, ic_wp_fin_last4, trade, signature_base64, signed_at }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexing for High-Density Filtering & Range Scans
CREATE INDEX IF NOT EXISTS idx_tbm_site_date ON TBM_Records(project_id, conducted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tbm_conducted_at ON TBM_Records(conducted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tbm_ptw ON TBM_Records(ptw_id);

PRAGMA foreign_keys = ON;
