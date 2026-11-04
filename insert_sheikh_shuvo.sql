-- Insert Worker Profile: SHEIKH SHUVO
INSERT INTO Worker_Registry (worker_id, name, ic_no, wp_no, fin_no, ic_wp_no, trade)
VALUES (
    'WRK-86128',
    'SHEIKH SHUVO',
    '',
    '0 6486128',
    'G8806788L',
    'G8806788L',
    'CONSTRUCTION'
);

-- Insert Certificate 1: MOM Work Permit & Visit Pass
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
VALUES (
    'WRK-86128',
    'Work Permit',
    '0 6486128',
    'Ministry of Manpower (Employer: SOLARGY PTE. LTD.)',
    '2022-05-26',
    '2026-05-26',
    1,
    '/api/certs/sheikh_shuvo_certs.pdf'
);

-- Insert Certificate 2: Apply Workplace Safety and Health in Construction Sites (CSOC)
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
VALUES (
    'WRK-86128',
    'Apply Workplace Safety and Health in Construction Sites',
    '03613-50965',
    'EVERSAFE ACADEMY',
    '2022-04-18',
    '2026-04-18',
    1,
    '/api/certs/sheikh_shuvo_certs.pdf'
);

