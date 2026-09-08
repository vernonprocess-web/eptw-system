-- Phase 5 Migration: Add email and phone columns to Worker_Registry & PM columns to PTW_Records
ALTER TABLE Worker_Registry ADD COLUMN email TEXT;
ALTER TABLE Worker_Registry ADD COLUMN phone TEXT;
ALTER TABLE PTW_Records ADD COLUMN assigned_pm_name TEXT;
ALTER TABLE PTW_Records ADD COLUMN assigned_pm_email TEXT;
