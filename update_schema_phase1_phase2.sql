-- Phase 1 & Phase 2 Schema Extensions for ePTW System

-- 1. Extend Project_Directory table with Safety Personnel & Contact Info
ALTER TABLE Project_Directory ADD COLUMN wsho_name TEXT;
ALTER TABLE Project_Directory ADD COLUMN wsho_email TEXT;
ALTER TABLE Project_Directory ADD COLUMN wsho_phone TEXT;
ALTER TABLE Project_Directory ADD COLUMN pm_email TEXT;

-- 2. Extend PTW_Records table with Multi-Stage Workflow Signatures & Timestamps
ALTER TABLE PTW_Records ADD COLUMN applicant_signature TEXT;
ALTER TABLE PTW_Records ADD COLUMN safety_signature TEXT;
ALTER TABLE PTW_Records ADD COLUMN pm_signature TEXT;
ALTER TABLE PTW_Records ADD COLUMN safety_vetted_at DATETIME;
ALTER TABLE PTW_Records ADD COLUMN pm_approved_at DATETIME;
ALTER TABLE PTW_Records ADD COLUMN closed_at DATETIME;
ALTER TABLE PTW_Records ADD COLUMN rejection_reason TEXT;

-- 3. Update existing seed project with default Safety Assessor contacts
UPDATE Project_Directory 
SET wsho_name = 'Alex Tan (WSHO)', 
    wsho_email = 'alex.tan@safety-wsh.sg', 
    wsho_phone = '+65 9123 4567', 
    pm_email = 'vernon.tan@company.com'
WHERE project_id = 'PRJ-001';

UPDATE Project_Directory 
SET wsho_name = 'David Lim (WSHO)', 
    wsho_email = 'david.lim@safety-wsh.sg', 
    wsho_phone = '+65 9876 5432', 
    pm_email = 'vernon.tan@company.com'
WHERE project_id = 'PRJ-002';
