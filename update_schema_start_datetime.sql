-- Migration: Add Permit Start Date/Time column to PTW_Records
ALTER TABLE PTW_Records ADD COLUMN start_datetime DATETIME;
