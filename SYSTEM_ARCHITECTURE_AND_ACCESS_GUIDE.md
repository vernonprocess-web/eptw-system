# ePTW System — Architecture, Access Routing & Data Flow Guide

## 🌐 1. The 3 Main Access Portals

| Portal Page | Interface & Purpose | Target User Roles | File Link / Web Route |
| :--- | :--- | :--- | :--- |
| **`login.html`** | **Central Authentication Gateway**<br>Entry point for all system users. Validates credentials, checks role privileges, and performs smart automatic routing. | All Users | [`public/login.html`](file:///c:/Users/User/Documents/eptw-system/public/login.html)<br>`/login.html` |
| **`supervisor.html`** | **Site Supervisor Mobile Kiosk Portal**<br>High-contrast, light-mode touch interface engineered specifically for field tablets operating under direct outdoor sunlight. | Site Supervisors | [`public/supervisor.html`](file:///c:/Users/User/Documents/eptw-system/public/supervisor.html)<br>`/supervisor.html` |
| **`index.html`** | **HQ Control Center & Admin Portal**<br>Comprehensive desktop/tablet dashboard for managing construction sites, RAMS safety libraries, AI OCR worker registries, permit vetting, and MOM compliance audit logs. | WSHOs, Project Managers, Safety Assessors, System Admins | [`public/index.html`](file:///c:/Users/User/Documents/eptw-system/public/index.html)<br>`/index.html` |

---

## 👤 2. User Roles & Smart Gateway Routing

When a user authenticates at `login.html`, the gateway inspects their role and automatically routes them to the appropriate portal:

```
                  ┌───────────────────────────────┐
                  │          login.html           │
                  │ Central Authentication Gateway│
                  └───────────────┬───────────────┘
                                  │
                   Role Check & Smart Routing
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
┌────────▼────────────────┐                      ┌─────────▼───────────────┐
│     supervisor.html     │                      │       index.html        │
│  Site Supervisor Portal │                      │   HQ Control Center     │
│   (Outdoor Field UI)    │                      │  (Full Admin Dashboard) │
└─────────────────────────┘                      └─────────────────────────┘
  • Site Supervisors                               • WSHO Safety Officers
                                                   • Project Managers (PM)
                                                   • Safety Assessors
                                                   • System Admins
```

### Role Capabilities & Responsibilities

#### 1. Site Supervisor (`SITE_SUPERVISOR`)
* **Login Routing**: `login.html` $\rightarrow$ **`supervisor.html`**
* **Key Actions**:
  * Select active construction / facility site from the location dropdown.
  * Draft electronic Permit-to-Work (ePTW) applications on outdoor touch tablets.
  * Link pre-approved RAMS hazard controls & OCR-verified certified workers.
  * Sign digital signature pad on touchscreen (compressed ~15KB base64 PNG).
  * Save local offline drafts if site Wi-Fi / 4G connection is lost.
  * Conduct daily pre-shift Toolbox Meetings (TBM) with site workers.

#### 2. Workplace Safety & Health Officer (`WSHO`)
* **Login Routing**: `login.html` $\rightarrow$ **`index.html`**
* **Key Actions**:
  * Vet, approve, or reject ePTW applications submitted by Supervisors.
  * Issue immediate site **Stand-Down** orders if unsafe conditions are detected.
  * Scan and verify worker safety certificates using **Gemini Vision AI OCR**.
  * Conduct safety inspections and audits.

#### 3. Project Manager (`PROJECT_MANAGER`)
* **Login Routing**: `login.html` $\rightarrow$ **`index.html`**
* **Key Actions**:
  * Register new construction & facility sites in the **Project Directory**.
  * Assign designated WSHOs and Site Supervisors to active projects.
  * Monitor site activity and permit clearance statuses across all active projects.

#### 4. Safety Assessor & System Admin (`SAFETY_ASSESSOR` / `ADMIN`)
* **Login Routing**: `login.html` $\rightarrow$ **`index.html`**
* **Key Actions**:
  * Review Risk Priority Numbers (RPN) for high-hazard activities.
  * Review non-repudiable audit logs (Singapore SGT timezone) for Ministry of Manpower (MOM) & WSH Act compliance.

---

## 💾 3. Data Storage & System Integration

The system leverages **Cloudflare D1 (Serverless SQL Database)** and **Cloudflare R2 (Object Storage)** to sync data in real time between HQ management and field tablets:

```
  HQ Dashboard (index.html)                       Field Tablet (supervisor.html)
  [ Create Sites / Upload Certs ]                 [ Select Site / Apply ePTW ]
                 │                                              │
                 └──────────────────────┬───────────────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   Cloudflare Backend API    │
                         └──────────────┬──────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
      ┌──────────▼──────────┐                       ┌──────────▼──────────┐
      │  Cloudflare D1 SQL  │                       │    Cloudflare R2    │
      │   (master-rams-db)  │                       │    (cert-bucket)    │
      └─────────────────────┘                       └─────────────────────┘
       • Project_Directory                           • Scanned IC / Work
       • Master_RAMS_Library                           Permit Images
       • Worker_Registry                             • Scanned WSQ Safety
       • PTW_Applications                              Certificates
       • TBM_Records
       • Audit_Logs
```

### Database Schema & Linking Structure

1. **`Project_Directory`** (Sites & Locations)
   * Stores `project_id`, `project_name`, `location`, `pm_email`, `wsho_email`, and status (`Active`).
   * *Data Link*: Automatically populates the **Active Site** dropdown menu in `supervisor.html`.

2. **`Master_RAMS_Library`** (Risk Assessments)
   * Stores activity categories, work activities, hazards, control measures, Severity (S), Likelihood (L), and RPN score ($S \times L$).
   * *Data Link*: Populates the RAMS hazard checklist in `supervisor.html` for supervisors to select during permit creation.

3. **`Worker_Registry` & `Worker_Certificates`**
   * Stores worker names, IC/Work Permit/FIN numbers, trades, and WSQ safety certifications parsed by Gemini AI OCR.
   * *Data Link*: Populates the certified worker selection grid in `supervisor.html`.

4. **`PTW_Applications`** (Electronic Permits)
   * Stores permit type (*Working at Height*, *Hot Work*, *Electrical LOTO*, *Confined Space*, etc.), start/expiry datetimes, work description, digital signatures, status (*Pending Vetting*, *Approved*, *Stand-Down*), and links directly to `project_id`.

5. **`TBM_Records`** (Toolbox Briefings)
   * Auto-generated for every active permit per shift date. Stores attendance counts, hazard summary briefings, worker concerns, and supervisor signatures.

6. **`Audit_Logs`**
   * Tracks system actions (logins, submissions, approvals, stand-downs) with non-repudiable user attribution and SGT (UTC+8) timestamps.

---

## 🔄 4. Complete End-to-End Operational Lifecycle

1. **HQ Site Registration (`index.html`)**: Project Manager registers a new site (*e.g., Jurong Island Solar PV Installation*) under **Tab 3: Project Directory**.
2. **Worker Certification (`index.html`)**: WSHO uploads worker safety certs via Gemini Vision AI OCR into **Tab 2: Worker Registry**.
3. **Field Permit Application (`supervisor.html`)**: Site Supervisor opens their field tablet, selects *Jurong Island Solar PV*, drafts an ePTW, checks off linked RAMS hazards & certified workers, signs digitally, and clicks **Submit**.
4. **WSHO Vetting & Approval (`index.html`)**: WSHO receives instant notification, reviews permit details and signed RAMS controls, and clicks **Approve**.
5. **Daily Shift TBM Briefing (`supervisor.html`)**: Supervisor conducts the pre-shift briefing with workers before high-risk work commences.
