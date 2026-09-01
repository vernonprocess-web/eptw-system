-- Worker Registry Schema & Multi-Certificate Database Structure
DROP TABLE IF EXISTS Worker_Certificates;
DROP TABLE IF EXISTS Worker_Registry;

-- Worker Profiles (1 row per worker)
CREATE TABLE IF NOT EXISTS Worker_Registry (
    worker_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ic_no TEXT,
    wp_no TEXT,
    fin_no TEXT,
    ic_wp_no TEXT,
    trade TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worker Certificates (Multiple certs per worker)
CREATE TABLE IF NOT EXISTS Worker_Certificates (
    cert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT NOT NULL,
    cert_type TEXT NOT NULL,       -- e.g. "Work Permit", "WSQ Supervise Safe Lifting Operation", "SOC Safety"
    cert_no TEXT,                  -- e.g. "LS-MF-COM-306E-1-00072"
    issuer TEXT,                   -- e.g. "Wong Fong Academy", "MOM Singapore"
    issued_date DATE,
    cert_expiry DATE,
    cert_valid BOOLEAN DEFAULT TRUE,
    cert_file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES Worker_Registry(worker_id) ON DELETE CASCADE
);

-- Initial seed data for Worker Registry
INSERT INTO Worker_Registry (worker_id, name, ic_no, wp_no, fin_no, trade) VALUES 
('WRK-1001', 'Ahmad Bin Ibrahim', '', '', 'G1234567M', 'Solar Installer & Electrician'),
('WRK-1002', 'Tan Kah Wee', 'S9876543A', '', '', 'Scaffolder & WAH Supervisor'),
('WRK-1003', 'Rajesh Kumar', '', '', 'F5432109K', 'Structural Steel Fitter'),
('WRK-80727', 'BABU MD NAIM', '', '0 64780727', '', 'CONSTRUCTION');

-- Initial seed certificates
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url) VALUES 
('WRK-1001', 'Work Permit', 'G1234567M', 'MOM Singapore', '2023-01-01', '2026-12-31', 1, ''),
('WRK-1001', 'SOC Safety Course', 'SOC-2024-8891', 'WSH Council', '2024-02-15', '2026-02-15', 1, ''),
('WRK-1002', 'Work Permit', 'S9876543A', 'MOM Singapore', '2022-05-10', '2025-05-15', 0, ''),
('WRK-1003', 'Work Permit', 'F5432109K', 'MOM Singapore', '2024-08-01', '2027-08-20', 1, ''),

-- Babu MD Naim: 1) Work Permit & 2) WSQ Supervise Safe Lifting Cert
('WRK-80727', 'Work Permit', '0 64780727', 'MOM Singapore', '2022-06-01', '2027-06-30', 1, '/api/certs/1788186811604_hb5cg3.png'),
('WRK-80727', 'WSQ Supervise Safe Lifting Operation', 'LS-MF-COM-306E-1-00072', 'Wong Fong Academy', '2023-01-25', '2028-01-25', 1, '');
