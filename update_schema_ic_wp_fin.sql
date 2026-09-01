-- Migration script to add ic_no, wp_no, and fin_no columns to Worker_Registry
ALTER TABLE Worker_Registry ADD COLUMN ic_no TEXT;
ALTER TABLE Worker_Registry ADD COLUMN wp_no TEXT;
ALTER TABLE Worker_Registry ADD COLUMN fin_no TEXT;

-- Migrate existing ic_wp_no records
UPDATE Worker_Registry 
SET wp_no = ic_wp_no 
WHERE ic_wp_no LIKE '0 %' OR ic_wp_no GLOB '[0-9]*';

UPDATE Worker_Registry 
SET ic_no = ic_wp_no 
WHERE ic_wp_no LIKE 'S%' OR ic_wp_no LIKE 'T%';

UPDATE Worker_Registry 
SET fin_no = ic_wp_no 
WHERE (ic_wp_no LIKE 'F%' OR ic_wp_no LIKE 'G%' OR ic_wp_no LIKE 'M%') AND (ic_no IS NULL OR ic_no = '');
