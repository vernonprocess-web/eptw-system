-- Insert Worker Profile: SAMIDURAI RAVI
INSERT INTO Worker_Registry (worker_id, name, ic_no, wp_no, fin_no, ic_wp_no, trade)
VALUES (
    'WRK-55878',
    'SAMIDURAI RAVI',
    '',
    '0 32955878',
    'G7598230K',
    'G7598230K',
    'CONSTRUCTION'
);

-- Insert Certificate 1: MOM Work Permit & Visit Pass
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
VALUES (
    'WRK-55878',
    'Work Permit',
    '0 32955878',
    'Ministry of Manpower (Employer: 60 COY PTE. LTD.)',
    '2026-09-21',
    NULL,
    1,
    '/api/certs/samidurai_ravi_certs.pdf'
);

-- Insert Certificate 2: Building Construction Supervisors Safety Course (BCSS)
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
VALUES (
    'WRK-55878',
    'Building Construction Supervisors Safety Course (BCSS)',
    'BCSS PR-E-61-05',
    'WSH Council / Training Division (8 Pereira Road)',
    '2015-04-12',
    NULL,
    1,
    '/api/certs/samidurai_ravi_certs.pdf'
);

-- Insert Certificate 3: Work-At-Height Course for Supervisors (WAHS)
INSERT INTO Worker_Certificates (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
VALUES (
    'WRK-55878',
    'Work-At-Height Course for Supervisors (WAHS)',
    'ES-WAHS-1184-0199',
    'EVER SAFE CONSULTANTS PTE LTD',
    '2016-12-26',
    NULL,
    1,
    '/api/certs/samidurai_ravi_certs.pdf'
);

