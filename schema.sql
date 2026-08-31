-- Schema for Master RAMS (Risk Assessment & Method Statement) Library

CREATE TABLE IF NOT EXISTS Master_RAMS_Library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_category TEXT NOT NULL,
    work_activity TEXT NOT NULL,
    hazard TEXT NOT NULL,
    possible_accident TEXT NOT NULL,
    control_measures TEXT NOT NULL,
    severity_s INTEGER NOT NULL CHECK (severity_s BETWEEN 1 AND 5),
    likelihood_l INTEGER NOT NULL CHECK (likelihood_l BETWEEN 1 AND 5),
    rpn INTEGER NOT NULL
);

-- Sample Data for "Solar Equipment Installation" (Singapore WSH Standard)
INSERT INTO Master_RAMS_Library (
    activity_category,
    work_activity,
    hazard,
    possible_accident,
    control_measures,
    severity_s,
    likelihood_l,
    rpn
) VALUES 
(
    'Solar Equipment Installation',
    'Rooftop Solar Panel Mounting Structure Installation',
    'Working at Elevated Heights & Fragile Roofing',
    'Fall from height resulting in severe fractures or fatality',
    '1) Elimination: Pre-assemble structural framing on ground level to minimize elevated working hours.
2) Substitution: Deploy dedicated mobile crane/hoist mechanical lifting equipment instead of manual rooftop carrying.
3) Engineering Controls: Install SS 568 compliant perimeter guardrails, toe-boards, permanent anchor lifelines, and fragile roof crawling boards.
4) Administrative Controls: Formulate WSH Working-at-Heights Plan & Permit-to-Work (PTW); conduct daily Toolbox Talks and verify WAH certification.
5) PPE: Wear SS 528 compliant full-body harness with double lanyard & shock absorber, safety helmet with chin strap, and anti-slip safety boots.',
    5,
    2,
    10
),
(
    'Solar Equipment Installation',
    'DC Cabling & Inverter Wiring Integration',
    'High-Voltage Direct Current (DC) Exposure & Live Circuits',
    'Electrical shock, arc flash burns, or equipment damage',
    '1) Elimination: Perform all cable termination with solar array completely de-energized and strings isolated.
2) Substitution: Use touch-safe IP67/IP68 rated solar connectors and enclosed switch disconnectors.
3) Engineering Controls: Install DC isolator switches, insulated barriers, arc-flash boundary guarding, and rapid shutdown devices.
4) Administrative Controls: Enforce Lockout/Tagout (LOTO) under Licensed Electrical Worker (LEW) supervision; issue Electrical PTW; conduct voltage verification testing.
5) PPE: Wear IEC 60903 class 0 (1000V rated) insulated gloves, arc-flash rated face shield, flame-resistant clothing, and dielectric safety shoes.',
    5,
    2,
    10
),
(
    'Solar Equipment Installation',
    'Manual Lifting & Handling of PV Modules',
    'Heavy Lifting & Awkward Postures on Sloped Roofs',
    'Musculoskeletal injuries, spinal strain, dropped panel hitting workers below',
    '1) Elimination: Utilize mechanical panel hoists or cranes for direct roof delivery to eliminate manual carrying up ladders.
2) Substitution: Deploy ergonomic vacuum suction lifting handlers instead of direct manual carrying.
3) Engineering Controls: Set up secure staging platforms on roof; erect barricaded drop-zone exclusion fencing below.
4) Administrative Controls: Enforce WSH Ergonomic Guidelines (max 20kg/person, mandatory 2-man team lifting); schedule mandatory work rest cycles.
5) PPE: Wear ANSI Level A4 cut-resistant grip gloves, steel-toe anti-slip safety boots, and safety helmet with chin strap.',
    3,
    2,
    6
),
(
    'Solar Equipment Installation',
    'Battery Energy Storage System (BESS) Commissioning',
    'Thermal Runaway & Chemical Exposure from Battery Cells',
    'Toxic gas inhalation, chemical burns, explosion, or localized fire',
    '1) Elimination: Mechanically isolate and lockout battery strings during installation prior to testing.
2) Substitution: Select safer LiFePO4 (LFP) chemistry modules with integrated thermal management over standard NMC chemistry.
3) Engineering Controls: Install H2/CO gas detectors, mechanical exhaust ventilation, and clean-agent automatic fire suppression systems.
4) Administrative Controls: Establish BESS PTW & Emergency Response Plan (ERP) adhering to SCDF guidelines; display Hazmat warning signs; restrict entry to certified personnel.
5) PPE: Wear chemical-resistant nitrile/neoprene gloves, splash-proof safety goggles, full face shield, and chemical protective apron.',
    4,
    2,
    8
),
(
    'Solar Equipment Installation',
    'Site Clearance & Waste Disposal',
    'Sharp Metal Edges & Broken Glass / Solar Cells',
    'Lacerations, puncture wounds, eye injuries from flying debris',
    '1) Elimination: Implement pre-sorting at source using dedicated sealable waste skips to eliminate loose scattered debris.
2) Substitution: Deploy magnetic sweepers and industrial vacuum collectors instead of manual hand picking of glass & metal offcuts.
3) Engineering Controls: Install enclosed trash chutes for lowering waste from roofs; provide puncture-proof covered waste bins.
4) Administrative Controls: Enforce Singapore NEA & WSH general housekeeping guidelines; mandate regular site cleanup schedules.
5) PPE: Wear EN 388 Level D cut-resistant safety gloves, ANSI Z87.1 impact safety glasses, and heavy-duty steel-toe safety boots.',
    2,
    2,
    4
);

