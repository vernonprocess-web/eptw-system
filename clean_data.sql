-- Clean up all workers, projects, permits, TBMs, users, and audit logs
-- Retains Master_RAMS_Library completely intact
PRAGMA foreign_keys = OFF;

DELETE FROM Worker_Certificates;
DELETE FROM Worker_Registry;
DELETE FROM TBM_Records;
DELETE FROM PTW_Records;
DELETE FROM Project_Directory;
DELETE FROM users;
DELETE FROM Telegram_Users;
DELETE FROM Audit_Logs;

DELETE FROM sqlite_sequence WHERE name IN ('Worker_Certificates', 'Audit_Logs');

PRAGMA foreign_keys = ON;

