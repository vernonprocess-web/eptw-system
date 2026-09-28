-- Universal Soft Delete & Data Normalization Migration Script (Safe Column Additions)
PRAGMA foreign_keys = OFF;

-- Ensure deleted_at on Master_RAMS_Library and users
ALTER TABLE Master_RAMS_Library ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- Indexes for performance on soft-deleted lookups
CREATE INDEX IF NOT EXISTS idx_rams_deleted ON Master_RAMS_Library(deleted_at);
CREATE INDEX IF NOT EXISTS idx_ptw_deleted ON PTW_Records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tbm_deleted ON TBM_Records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_worker_deleted ON Worker_Registry(deleted_at);
CREATE INDEX IF NOT EXISTS idx_project_deleted ON Project_Directory(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

PRAGMA foreign_keys = ON;
