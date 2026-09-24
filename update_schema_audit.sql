-- Migration Script: Audit Compliance, Soft Delete Support & Audit Log Ledger
PRAGMA foreign_keys = OFF;

-- 1. Add deleted_at columns for soft-delete support
ALTER TABLE Project_Directory ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE PTW_Records ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE TBM_Records ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE Worker_Registry ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- 2. Create Immutable Audit_Logs Ledger Table
CREATE TABLE IF NOT EXISTS Audit_Logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,          -- e.g. 'CREATE_PROJECT', 'DELETE_EMPTY_PROJECT', 'ARCHIVE_PROJECT', 'APPROVE_PTW', 'CANCEL_PERMIT'
    target_table TEXT NOT NULL,    -- 'Project_Directory', 'PTW_Records', 'TBM_Records', 'Worker_Registry'
    target_id TEXT NOT NULL,       -- 'PRJ-001', 'PTW-2026-001'
    details TEXT,
    timestamp DATETIME NOT NULL    -- Explicit Asia/Singapore (SGT) timestamp string
);

-- Performance Indexes for WSH Auditors
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON Audit_Logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON Audit_Logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON Audit_Logs(user_email);

PRAGMA foreign_keys = ON;
