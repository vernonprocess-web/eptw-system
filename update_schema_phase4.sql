-- Migration Script for Phase 4: Targeted Notifications & Telegram Pairing
-- Adds applicant & assigned WSHO email tracking to PTW_Records
-- Creates Telegram_Users lookup table for 1-tap Telegram bot account binding

-- 1. Extend PTW_Records table
ALTER TABLE PTW_Records ADD COLUMN applicant_email TEXT;
ALTER TABLE PTW_Records ADD COLUMN assigned_wsho_name TEXT;
ALTER TABLE PTW_Records ADD COLUMN assigned_wsho_email TEXT;

-- 2. Create Telegram_Users lookup table
CREATE TABLE IF NOT EXISTS Telegram_Users (
    email TEXT PRIMARY KEY,
    telegram_chat_id TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
