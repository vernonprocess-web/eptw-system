-- Migration: Add Permit Closure Verification Audit Columns to PTW_Records
ALTER TABLE PTW_Records ADD COLUMN closing_signature TEXT;
ALTER TABLE PTW_Records ADD COLUMN closed_by_email TEXT;
ALTER TABLE PTW_Records ADD COLUMN closing_remarks TEXT;
ALTER TABLE PTW_Records ADD COLUMN deisolation_verified INTEGER DEFAULT 0;
