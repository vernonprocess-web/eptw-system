-- Master RAMS (Risk Assessment & Method Statement) Library Schema & Comprehensive Seed Data
-- Aligned with Singapore WSH Standards, BCA, SCDF Fire Code, EMA/SP Group Regulations, and Hierarchy of Controls

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

-- ============================================================================
-- PHASE 1: Pre-Execution & Engineering Clearances
-- ============================================================================

(
    'Phase 1: Pre-Execution & Engineering Clearances',
    'Site Survey & Structural Assessment',
    'Working at Height on Un-inspected Roof Decks & Fragile Roofing Structures',
    'Fall from height through fragile roof sheets/skylights resulting in severe injury or fatality',
    '1) Elimination: Conduct initial roof layout assessment using high-resolution drone photography to minimize physical roof walking.
2) Substitution: Utilize crawler boards and temporary walking platforms instead of direct stepping on metal roofing sheets.
3) Engineering Controls: Install temporary edge guardrails and line anchor points prior to structural inspection.
4) Administrative Controls: Formulate WSH Working-at-Heights (WAH) Plan; verify roof structural load rating with PE prior to access; conduct pre-entry briefing.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 1: Pre-Execution & Engineering Clearances',
    'Site Survey & Structural Assessment',
    'Contact with Energized Live Parts during Main Switchboard (MSB) Route Survey',
    'Electrocution, electric shock, or arc flash burns during electrical containment routing',
    '1) Elimination: Maintain safe approach distance from exposed live MSB busbars during visual cable route mapping.
2) Substitution: Utilize non-conductive fiberglass measuring tapes and thermal imaging cameras for MSB inspection.
3) Engineering Controls: Ensure MSB protective shrouds and transparent barriers remain closed during survey.
4) Administrative Controls: Conduct survey under direct Licensed Electrical Worker (LEW) escort; prohibit opening live MSB panels during initial survey.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 1: Pre-Execution & Engineering Clearances',
    'Engineering Endorsements & Agency Filings',
    'Inaccurate Load Calculations Leading to Roof Structural Overload or Wind Uplift Failure',
    'Roof structural collapse or solar array detachment during severe gale/monsoon winds',
    '1) Elimination: Mandate PE (Structural) structural re-verification for all roof dead/live/wind loads exceeding BCA Code requirements.
2) Substitution: Redesign mounting layout to distribute ballast weight evenly across primary RC beams/purlins.
3) Engineering Controls: Implement PE-certified chemical anchor bolts and ballast block fixing specifications.
4) Administrative Controls: Secure formal PE endorsement and submit grid connection filings to SP Group / EMA prior to site mobilization.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 1: Pre-Execution & Engineering Clearances',
    'Safety Documentation & Approvals',
    'Omission of Critical Safety Plans Leading to Uncontrolled Site Operations',
    'Workplace accidents due to lack of standard operating procedures and emergency preparedness',
    '1) Elimination: Prohibit any site activity until all safety documentation and Permits-to-Work (PTW) are authorized.
2) Substitution: Standardize RAMS, Fall Prevention Plan (FPP), and Emergency Response Plan across all site contractors.
3) Engineering Controls: Establish centralized digital PTW monitoring board and emergency contact call points.
4) Administrative Controls: Submit Notice of Commencement to relevant authorities; mandate safety induction for all site personnel.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),

-- ============================================================================
-- PHASE 2: Site Preparation & Access Setup
-- ============================================================================

(
    'Phase 2: Site Preparation & Access Setup',
    'Site Mobilization & Access Control',
    'Unauthorized Entry into Material Holding Zones & Heavy Machinery Traffic Collisions',
    'Pedestrian worker struck by forklift/delivery trucks or crushed by shifting material pallets',
    '1) Elimination: Establish strict physical separation between pedestrian walkways and heavy material transport routes.
2) Substitution: Schedule heavy material deliveries during off-peak facility operating hours.
3) Engineering Controls: Erect solid barricades, heavy-duty hoarding, and clear safety warning signages around holding zones.
4) Administrative Controls: Appoint trained banksmen/traffic marshals to guide delivery vehicles; mandate site registration.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 2: Site Preparation & Access Setup',
    'Edge Protection & Fall Prevention',
    'Unprotected Roof Boundaries & Fragile Skylight Openings [CRITICAL HAZARD 1]',
    'Worker fall from height through open edges or skylights resulting in fatality',
    '1) Elimination: Restrict roof access until perimeter edge protection and skylight covers are 100% installed.
2) Substitution: Use mobile elevating work platforms (MEWP/boom lifts) for perimeter work where feasible.
3) Engineering Controls: Install SS 568 compliant temporary perimeter guardrails (min 1m height, mid-rail, toe-board) and rigid timber skylight covers labeled "DANGER - OPENING".
4) Administrative Controls: Demarcate Controlled Access Zones (CAZ) with red warning tape 2m from roof edge; mandate WAH Supervisor inspection.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 2: Site Preparation & Access Setup',
    'Edge Protection & Fall Prevention',
    'Falling Objects & Hand Tools Dropped from Rooftop Perimeter [CRITICAL HAZARD 2]',
    'Struck-by injuries to personnel or public on ground level below roof perimeter',
    '1) Elimination: Prohibit staging of loose hand tools or hardware within 2m of roof boundaries.
2) Substitution: Replace manual hand carrying of loose items with enclosed tool bags attached to workers.
3) Engineering Controls: Fit mesh containment nets and solid 150mm toe-boards along all rooftop edge guardrail perimeters.
4) Administrative Controls: Erect ground-level exclusion drop zones with warning signs and physical barricades directly below work areas.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 2: Site Preparation & Access Setup',
    'Edge Protection & Fall Prevention',
    'Anchor Line Structural Failure or Improper Fall Arrest Attachment [CRITICAL HAZARD 3]',
    'Lifeline anchor displacement during fall arrest event causing worker impact with ground',
    '1) Elimination: Prioritize collective guardrail protection over individual fall arrest systems.
2) Substitution: Utilize travel restraint lanyards (preventing reaching edge) instead of fall arrest lanyards where possible.
3) Engineering Controls: Install PE-certified temporary horizontal lifelines anchored strictly to load-tested structural roof members.
4) Administrative Controls: Mandate daily visual and pull-test inspection of lifelines by WAH Assessor; log certification records.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 2: Site Preparation & Access Setup',
    'Permit-to-Work (PTW) & Briefings',
    'Sudden Severe Weather, Heavy Rain & Lightning Hazards during Elevated Setup',
    'Lightning strike or slip and fall on wet, slick metal roof surfaces',
    '1) Elimination: Cease all rooftop activities immediately upon activation of NEA Rain/Lightning warning alert.
2) Substitution: Shift operations to indoor ground-level pre-assembly during adverse weather.
3) Engineering Controls: Install solar-powered lightning warning siren/visual beacon on roof deck.
4) Administrative Controls: Enforce mandatory Stop-Work Order upon lightning warning siren; conduct pre-shift Toolbox Meetings (TBM) covering weather egress.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),

-- ============================================================================
-- PHASE 3: Heavy Logistics & Primary Hoisting
-- ============================================================================

(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Crane Rigging & Ground Staging',
    'Outrigger Ground Collapse & Sub-Soil Instability under Mobile Crane [CRITICAL HAZARD 1]',
    'Mobile crane tipping/toppling over causing catastrophic structural damage and multi-fatality',
    '1) Elimination: Avoid positioning crane near un-verified underground trenches, manholes, or soft soil banks.
2) Substitution: Utilize heavy-duty steel outrigger spreader plates to distribute point loads over larger surface area.
3) Engineering Controls: Verify ground bearing capacity with Professional Geotechnical/Structural Engineer assessment.
4) Administrative Controls: Mandate Lifting Supervisor approval of Lifting Plan; conduct pre-lift ground inspection checklist.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Crane Rigging & Ground Staging',
    'Lifting Gear Failure (Snapped Webbing Sling, Shackle, or Spreader Bar) [CRITICAL HAZARD 2]',
    'Dropped solar module pallet from height striking personnel or damaging facility building',
    '1) Elimination: Inspect and reject any worn, frayed, or damaged webbing slings prior to rigging.
2) Substitution: Utilize certified modular lifting cages with net containment instead of open pallet slings.
3) Engineering Controls: Use MOM-certified lifting gears, shackles, and spreader beams with valid 1-year LM certificates.
4) Administrative Controls: Appoint certified Rigger & Signalman to inspect all rigging arrangements before hoisting approval.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Crane Rigging & Ground Staging',
    'Overhead High-Voltage Power Line Proximity & Crane Boom Contact [CRITICAL HAZARD 3]',
    'Electrocution of rigger/crane operator and severe electrical explosion',
    '1) Elimination: Maintain minimum 6-meter safe clearance from overhead power lines at all times.
2) Substitution: Relocate crane setup position away from overhead electrical lines where feasible.
3) Engineering Controls: Install physical height limiting devices and proximity warning sensors on crane boom.
4) Administrative Controls: Obtain clearance from SP Group; establish goalpost warning barriers on ground with dedicated safety spotter.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Mobile Crane Lifting to Rooftop',
    'Overloading Designated Roof Structural Staging Zones [CRITICAL HAZARD 1]',
    'Local roof truss collapse due to concentrated point loading of heavy module pallets',
    '1) Elimination: Prohibit concentrated stacking of multiple module pallets in single roof bays.
2) Substitution: Distribute module pallets immediately across PE-designated primary structural column lines.
3) Engineering Controls: Lay timber dunnage mats across purlins to distribute pallet weight evenly over roof structure.
4) Administrative Controls: Strictly follow PE Structural Staging Layout Plan; limit maximum load per staging zone.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Mobile Crane Lifting to Rooftop',
    'Uncontrolled Load Swing Caused by High Wind Gusts [CRITICAL HAZARD 2]',
    'Suspended load colliding with building structures, parapet walls, or rooftop workers',
    '1) Elimination: Cease all hoisting operations when wind speed exceeds 10 m/s (20 knots).
2) Substitution: Utilize guided rail hoisting systems during gusty seasonal monsoon periods.
3) Engineering Controls: Install dual tag lines attached to opposite corners of the lifted pallet load.
4) Administrative Controls: Mandate Signalman line-of-sight communication via 2-way radio; monitor anemometer readings.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Mobile Crane Lifting to Rooftop',
    'Personnel Standing Directly Under Suspended Load during Hoisting [CRITICAL HAZARD 3]',
    'Crush fatality or severe impact injury from dropped material load',
    '1) Elimination: Strictly enforce prohibition of any person standing under or near suspended loads.
2) Substitution: Use remote video monitoring for blind rooftop landing zones.
3) Engineering Controls: Erect rigid exclusion zone fencing on ground and rooftop landing areas.
4) Administrative Controls: Assign dedicated banksman to enforce exclusion zone; signal horn prior to load movement.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Roof Distribution (Manual & Mechanical)',
    'Musculoskeletal Injuries & Back Strain from Manual Handling of PV Modules',
    'Spinal injury, lumbar strain, or cumulative soft tissue trauma from repetitive heavy lifting',
    '1) Elimination: Utilize specialized mechanical panel lifters and specialized roof transport carts.
2) Substitution: Mandate mandatory 2-person team lifting for individual modules exceeding 20kg.
3) Engineering Controls: Use pneumatic suction cup lifters and height-adjustable unloading tables on roof deck.
4) Administrative Controls: Enforce WSH Ergonomic Guidelines; schedule mandatory 15-minute rest rotations every 2 hours.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    3,
    9
),
(
    'Phase 3: Heavy Logistics & Primary Hoisting',
    'Roof Distribution (Manual & Mechanical)',
    'Overturning of Material Carts / Trolleys on Sloped Metal Roof Profile',
    'Panel trolley tipping over, causing module breakage and falling object hazard below',
    '1) Elimination: Avoid transport of un-strapped loose panels on sloped roof sections exceeding 15 degrees.
2) Substitution: Utilize custom profile-matching roof trolleys equipped with mechanical wheel brakes.
3) Engineering Controls: Install temporary guide tracks or secure tether lines for material trolleys on sloped roof profiles.
4) Administrative Controls: Limit trolley payload to manufacturer rating; clear roof pathways of loose cords/debris.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    2,
    6
),

-- ============================================================================
-- PHASE 4: Mechanical & Structural Installation
-- ============================================================================

(
    'Phase 4: Mechanical & Structural Installation',
    'Mounting Frame Installation',
    'Roof Sheet Penetration & Waterproofing Failure Leading to Water Leakage [CRITICAL HAZARD 1]',
    'Water ingress into building causing electrical short circuits and building structural damage',
    '1) Elimination: Utilize non-penetrating standing-seam clamps for metal roofs wherever structural profile allows.
2) Substitution: Use pre-cast ballast concrete blocks on RC roofs instead of mechanical expansion anchors where weight permits.
3) Engineering Controls: Apply EPDM rubber gaskets, UV-resistant sealant, and PE-approved chemical anchor sleeves on drill penetrations.
4) Administrative Controls: Conduct water tightness flood testing following bracket installation under PE supervision.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    2,
    6
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Mounting Frame Installation',
    'Flying Metal Swarf, Sharp Metal Chips & Noise Exposure during Drilling [CRITICAL HAZARD 2]',
    'Eye injury, corneal laceration, puncture wounds, or occupational noise-induced hearing loss',
    '1) Elimination: Use pre-punched mounting rails to minimize on-site drilling and cutting.
2) Substitution: Use low-speed hydraulic punch tools instead of high-speed rotary metal drills.
3) Engineering Controls: Fit magnetic swarf collectors on drill bits; utilize local exhaust / vacuum shrouds.
4) Administrative Controls: Mandate Hearing Conservation Program compliance; rotate workers operating metal cutters.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    3,
    9
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Mounting Frame Installation',
    'Insecure Fastener Torque & Mounting Rail Displacement [CRITICAL HAZARD 3]',
    'Rail detachment during wind storms causing solar array displacement and falling debris',
    '1) Elimination: Utilize self-locking structural fasteners and anti-vibration locking washers.
2) Substitution: Replace standard bolts with PE-approved stainless steel Grade A4-70 hardware.
3) Engineering Controls: Use calibrated digital torque wrenches set strictly to manufacturer/PE specified N-m torque limits.
4) Administrative Controls: Perform 100% torque audit and mark torqued bolts with paint pen; log PE quality control checklist.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Solar Module Placement & Clamping',
    'Uncontrolled Wind Gust Catching Glass Panels during Manual Handling [CRITICAL HAZARD 1]',
    'Worker dragged by panel wind sail effect resulting in fall from height or dropped glass module',
    '1) Elimination: Halt module placement when wind speeds exceed 8 m/s on roof deck.
2) Substitution: Transport modules in vertical rack carriers up to immediate mounting location.
3) Engineering Controls: Utilize suction-cup safety handles during module positioning onto rails.
4) Administrative Controls: Enforce 2-person synchronized placement routine; monitor roof anemometer continuously.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Solar Module Placement & Clamping',
    'Pinch Point & Hand Crush Injuries Between Module Frames & Aluminum Rails [CRITICAL HAZARD 2]',
    'Finger crush injury, severe bruising, or fracture during module seating and clamping',
    '1) Elimination: Design rail alignment guides to allow top-down drop placement without hand under-grip.
2) Substitution: Use plastic module corner protectors during alignment and handling.
3) Engineering Controls: Use long-reach torque hex drivers to keep hands clear of panel frame edges.
4) Administrative Controls: Brief workers on pinch point awareness during daily TBM; enforce clear verbal communication.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    3,
    9
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Solar Module Placement & Clamping',
    'Tempered Glass Module Breakage & Shard Lacerations [CRITICAL HAZARD 3]',
    'Deep laceration wounds or eye injury from shattered tempered solar glass fragments',
    '1) Elimination: Immediately quarantine and remove micro-cracked or damaged modules before installation.
2) Substitution: Use glass-glass double-tempered heavy-duty PV modules rated for high mechanical load.
3) Engineering Controls: Apply edge protection rubber trims on module frame corners during transport.
4) Administrative Controls: Establish broken glass cleanup procedure using magnetic sweepers and heavy-duty bins.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    2,
    6
),
(
    'Phase 4: Mechanical & Structural Installation',
    'Fire Code Clearance Verification',
    'Obstruction of SCDF Mandatory 1.5m Maintenance Aisles & 3.0m Fire Access Radius',
    'SCDF non-compliance fine, delayed firefighter roof access during building emergency, or fire spread',
    '1) Elimination: Ensure layout CAD design incorporates 1.5m aisles and 3.0m fire hatch radius before installation.
2) Substitution: Adjust sub-array dimensions to limit maximum block size to 60m x 40m per SCDF Fire Code.
3) Engineering Controls: Mark permanent yellow line boundaries on roof deck denoting fire access aisles.
4) Administrative Controls: Conduct pre-commissioning Fire Safety Inspection with Registered Inspector (RI).
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    1,
    4
),

-- ============================================================================
-- PHASE 5: Electrical System Setup Works
-- ============================================================================

(
    'Phase 5: Electrical System Setup Works',
    'DC Stringing & Management',
    'Electric Shock from High-Voltage DC Series Open-Circuit Voltage (Voc) under Sunlight [CRITICAL HAZARD 1]',
    'Severe DC electrical shock, cardiac arrest, or secondary fall from height',
    '1) Elimination: Cover solar module glass with light-blocking tarps or perform stringing during low irradiance hours.
2) Substitution: Utilize touch-safe IP67/IP68 rated MC4/EVO2 connectors with insulated locking sleeves.
3) Engineering Controls: Install inline DC string disconnectors and rapid shutdown module level electronics.
4) Administrative Controls: Restrict DC stringing strictly to trained electrical personnel supervised by LEW; mandate voltage check before connection.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    2,
    10
),
(
    'Phase 5: Electrical System Setup Works',
    'DC Stringing & Management',
    'Water Pooling Contact with Un-Elevated DC Solar Cabling [CRITICAL HAZARD 2]',
    'Cable insulation degradation, earth fault, localized arcing, and rooftop fire hazard',
    '1) Elimination: Keep all DC solar cables 100% elevated off roof deck surface using UV-resistant clips/trays.
2) Substitution: Utilize double-insulated halogen-free solar cables (EN 50618 / TÜV certified).
3) Engineering Controls: Install heavy-duty UV-resistant cable trays with snap-on covers raised 100mm above roof deck.
4) Administrative Controls: Conduct insulation resistance Megger testing prior to string connection; inspect routing.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 5: Electrical System Setup Works',
    'DC Stringing & Management',
    'Reverse Polarity / Mismatched DC Connectors Leading to Short Circuit [CRITICAL HAZARD 3]',
    'High-current DC arc flash, connector melt-down, or electrical fire during string mating',
    '1) Elimination: Standardize to single manufacturer MC4/EVO2 connector types across entire installation.
2) Substitution: Utilize key-coded polarity connectors to prevent physical reverse insertion.
3) Engineering Controls: Check DC polarity using calibrated digital multimeter (DMM) before final connector mating.
4) Administrative Controls: Implement string identification labeling (Positive red / Negative black) on all cable ends.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 5: Electrical System Setup Works',
    'Inverter & DC Isolator Mounting',
    'Heavy Inverter Unit Handling & Back Strain during Outdoor Rack Mounting',
    'Musculoskeletal lumbar injury or inverter dropping onto worker feet',
    '1) Elimination: Utilize portable material lifter/hoist to position inverter onto mounting bracket.
2) Substitution: Select modular string inverters with separate wall-mount backplates.
3) Engineering Controls: Fit temporary lifting handles on inverter casing during wall positioning.
4) Administrative Controls: Mandate 2 to 3-person team lift for inverters exceeding 30kg; verify bracket anchoring.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    2,
    6
),
(
    'Phase 5: Electrical System Setup Works',
    'Inverter & DC Isolator Mounting',
    'Inadvertent Energization of DC Isolator during Downstream Wiring',
    'Electric shock to wireman completing inverter DC terminations',
    '1) Elimination: Mechanically lock DC isolator handle in OFF position during wiring operations.
2) Substitution: Use padlocking switch disconnectors with visible contact break windows.
3) Engineering Controls: Install internal terminal protective insulating barriers inside DC isolator enclosure.
4) Administrative Controls: Implement strict Lockout/Tagout (LOTO) protocol; key held solely by working wireman.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 5: Electrical System Setup Works',
    'Cable Containment & AC Routing',
    'Sharp Metal Edges on Galvanized Cable Trunking & Metallic Conduit',
    'Deep hand laceration or cable insulation sheath damage during cable pulling',
    '1) Elimination: Deburr and file all cut ends of galvanized trunking and conduit before cable installation.
2) Substitution: Fit smooth plastic end bushes and rubber grommets on trunking entries and conduit terminations.
3) Engineering Controls: Use mechanical cable pulling winches with tension limiters for long vertical drops.
4) Administrative Controls: Mandate cable pulling safety briefing; inspect containment smoothness prior to pulling.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    3,
    9
),
(
    'Phase 5: Electrical System Setup Works',
    'Earthing & Lightning Protection',
    'Inadequate Earth Bonding Resulting in Static Buildup or Lightning Strike Hazard',
    'Rooftop fire, severe electrical shock from touch potential, or inverter destruction during lightning strike',
    '1) Elimination: Ensure continuous equipotential bonding across all metal module frames, mounting rails, and arrays.
2) Substitution: Use specialized serrated grounding washers (WEEB) that penetrate anodized rail coatings.
3) Engineering Controls: Connect array earth loop to building Earth Termination Network in compliance with SS 555 & SS 638; install Type 1+2 Surge Protection Devices (SPDs).
4) Administrative Controls: Mandate LEW earth resistance testing (<1 Ohm limit) before final commissioning approval.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 5: Electrical System Setup Works',
    'AC Interconnection',
    'Arc Flash & High-Energy Electrical Shock during Termination into Live Main Switchboard (MSB) [CRITICAL HAZARD 1]',
    'Fatal arc flash explosion, severe thermal burns, and building power outage',
    '1) Elimination: Schedule complete MSB busbar shutdown during final AC breaker installation where feasible.
2) Substitution: Utilize insulated VDE torque tools rated for 1000V working voltage.
3) Engineering Controls: Install transparent arc-rated polycarbonate shrouds inside MSB breaker compartment.
4) Administrative Controls: Perform termination under direct Supervision of Licensed Electrical Worker (LEW); issue High-Voltage/Electrical PTW.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 5: Electrical System Setup Works',
    'AC Interconnection',
    'Inadvertent Re-energization of Main Breaker by Facility Staff [CRITICAL HAZARD 2]',
    'Electrocution of electrician performing cable glanding and terminal connections inside MSB',
    '1) Elimination: Mechanically lock MSB incoming solar breaker in OPEN position using LOTO hasp.
2) Substitution: Post dedicated electrical safety watchman at MSB room door during termination.
3) Engineering Controls: Fit physical breaker padlock attachments and warning lockout tags.
4) Administrative Controls: Enforce strict LEW Lockout/Tagout protocol; key retained by LEW until work completion.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 5: Electrical System Setup Works',
    'AC Interconnection',
    'Phase Mismatch / Incorrect AC Phase Rotation [CRITICAL HAZARD 3]',
    'Short circuit explosion, inverter damage, or trip of facility main incoming breaker upon energization',
    '1) Elimination: Perform phase rotation check (L1-L2-L3) using phase meter before connecting cables.
2) Substitution: Color-code AC cables strictly to SS 638 standards (Brown, Black, Grey, Blue, Yellow/Green).
3) Engineering Controls: Install phase monitoring relay with automatic trip protection on AC distribution board.
4) Administrative Controls: Mandate LEW verification and sign-off on phase continuity test sheet before breaker closure.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),

-- ============================================================================
-- PHASE 6: Testing, Commissioning & Handover
-- ============================================================================

(
    'Phase 6: Testing, Commissioning & Handover',
    'Cold Commissioning (Pre-Energization)',
    'High Voltage DC Electric Shock during Megger Insulation Resistance & Voc/Isc Testing',
    'Electric shock or electrical burn from high-voltage test leads during string measurement',
    '1) Elimination: Ensure DC string isolator is locked in OFF position during Megger testing.
2) Substitution: Utilize safety-shrouded test probes rated for CAT IV 1000V.
3) Engineering Controls: Use automated solar PV test meters (e.g. Seaward PV200) with auto-discharge feature.
4) Administrative Controls: Mandate LEW supervision; establish barricaded testing area; verify test instrument calibration.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
),
(
    'Phase 6: Testing, Commissioning & Handover',
    'Energization & Hot Commissioning',
    'Arc Flash Explosion during Initial AC/DC Switch-On under Full Load [CRITICAL HAZARD 1]',
    'Severe thermal burns, blast injury, or fire during initial inverter start-up',
    '1) Elimination: Verify zero-load state before closing DC isolators and AC circuit breakers.
2) Substitution: Stand clear of inverter front panel enclosure during initial energization sequence.
3) Engineering Controls: Install remote switch-actuators or extension handles for initial breaker closure.
4) Administrative Controls: Enforce Commissioning PTW under LEW command; restrict room entry to essential testing team.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 6: Testing, Commissioning & Handover',
    'Energization & Hot Commissioning',
    'Anti-Islanding Protection Failure Causing Reverse Power Feed to SP Group Grid [CRITICAL HAZARD 2]',
    'Electrocution of SP Group grid maintenance workers operating on external utility lines',
    '1) Elimination: Perform mandatory anti-islanding trip test prior to commercial operation approval.
2) Substitution: Utilize grid-tied inverters certified to IEC 62116 / IEEE 1547 anti-islanding standards.
3) Engineering Controls: Install external loss-of-mains (LOM) protection relay configured to SP Group settings.
4) Administrative Controls: Submit LEW Commissioning Test Results (Form CS/5) to EMA/SP Group; obtain turn-on clearance.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    5,
    1,
    5
),
(
    'Phase 6: Testing, Commissioning & Handover',
    'Authority / SP Group Inspection',
    'Live Busbar Exposure during SP Bi-Directional Meter Installation & LEW Inspection',
    'Accidental contact with live terminals causing arc flash or electrical shock during meter wiring',
    '1) Elimination: Isolate meter test terminal block prior to SP Group meter connection.
2) Substitution: Use insulated meter installation tools rated for 1000V working voltage.
3) Engineering Controls: Ensure meter cabinet clear acrylic safety barriers are fitted.
4) Administrative Controls: Conduct joint inspection with SP Officer and LEW; follow SP Group metering safety guidelines.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    1,
    4
),
(
    'Phase 6: Testing, Commissioning & Handover',
    'Site Clearance & Waste Disposal',
    'Puncture & Laceration Wounds from Sharp Metal Offcuts, Broken Glass & Packaging Waste',
    'Hand cut injuries, foot puncture wounds, or eye injuries from scattered site debris',
    '1) Elimination: Implement continuous daily waste clearance and segregation at source during all phases.
2) Substitution: Utilize magnetic sweepers and industrial vacuums for collecting metal shavings and glass shards.
3) Engineering Controls: Provide puncture-proof covered waste skips and enclosed debris chutes from roof deck.
4) Administrative Controls: Engage NEA-licensed waste management contractor; conduct final roof clearance inspection.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    3,
    2,
    6
),
(
    'Phase 6: Testing, Commissioning & Handover',
    'Site Clearance & Waste Disposal',
    'Falling Objects during Dismantling of Temporary Guardrails & Lifelines',
    'Dismantled guardrail pipe or clamp dropped from roof edge striking ground personnel',
    '1) Elimination: Establish ground exclusion zone before starting guardrail dismantling.
2) Substitution: Lower dismantled components using rope pulley system or crane material basket instead of hand passing.
3) Engineering Controls: Keep toe-boards installed until upper rails are completely lowered.
4) Administrative Controls: Conduct dismantling under WAH Supervisor direction; post ground safety spotters.
5) Personal Protective Equipment (PPE): Full-body safety harness (SS 570) connected to designated anchors in travel restraint mode; safety helmet with fastened chin strap (SS 98); safety footwear (SS 513); EN 388:2016 Cut 1 gloves; and high-visibility vest. (Exemption / Non-Harness Condition: Full-body harness is not required where permanent solid parapet walls min 1m high or certified collective perimeter edge guardrails are in place or/where no fall-from-height hazard exists or/when work is performed entirely at ground level.)',
    4,
    2,
    8
);
