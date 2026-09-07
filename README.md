# ePTW System & Site Management Dashboard

A high-performance, spreadsheet-like electronic Permit-to-Work (ePTW) and Site Safety Management System built using **Cloudflare Workers (Hono framework)**, **Cloudflare D1 (SQLite)**, **Cloudflare R2 Storage**, and a **Vanilla HTML/CSS/JS** frontend.

---

## 📁 Repository Structure

```text
├── schema.sql                   # Base RAMS database schema & initial seed data
├── add_workers.sql              # Worker Registry & Multi-Certificate schema
├── add_projects.sql             # Project / Site Directory schema & seed data
├── add_ptw.sql                  # ePTW Transaction Engine schema & seed permits
├── update_schema_ic_wp_fin.sql  # IC/WP/FIN field normalization migration
├── src/
│   └── index.ts                 # Hono REST API backend & Gemini Vision OCR handler
├── public/
│   └── index.html               # Enterprise spreadsheet UI, Control Center & ePTW Engine
├── wrangler.json                # Cloudflare Worker, D1 & R2 binding configuration
├── package.json                 # Node.js dependencies and scripts
└── README.md                    # System documentation & deployment guide
```

---

## 🛠️ Local Development & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Execute Schemas on Local D1 Database
Execute all schema migration scripts to set up the local database:
```bash
npx wrangler d1 execute master-rams-db --local --file=./schema.sql
npx wrangler d1 execute master-rams-db --local --file=./add_workers.sql
npx wrangler d1 execute master-rams-db --local --file=./add_projects.sql
npx wrangler d1 execute master-rams-db --local --file=./add_ptw.sql
npx wrangler d1 execute master-rams-db --local --file=./update_schema_phase1_phase2.sql
npx wrangler d1 execute master-rams-db --local --file=./update_schema_phase4.sql
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:8787` to access the application.


---

## 🚀 Step-by-Step GitHub & Cloudflare Deployment Guide

### Step 1: Initialize Git and Push to GitHub

1. **Initialize Git Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Master RAMS Dashboard with Hono and D1"
   ```

2. **Create a New GitHub Repository**:
   - Go to [GitHub New Repository](https://github.com/new).
   - Set Repository Name: `master-rams-dashboard`.
   - Keep it Public or Private, leave "Initialize with README" **unchecked**, then click **Create repository**.

3. **Link Local Repository and Push**:
   ```bash
   # Rename default branch to main
   git branch -M main

   # Replace with your GitHub URL
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/master-rams-dashboard.git

   # Push code to GitHub
   git push -u origin main
   ```

---

### Step 2: Create Production D1 Database on Cloudflare

1. Login to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Run the following command in your terminal to create the live D1 database on Cloudflare:
   ```bash
   npx wrangler d1 create master-rams-db
   ```
3. **Copy the Output `database_id`**:
   The output will display your `database_id`, for example:
   ```text
   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
4. **Update `wrangler.json`**:
   Open `wrangler.json` and paste your actual `database_id`:
   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "master-rams-db",
       "database_id": "YOUR_ACTUAL_D1_DATABASE_ID"
     }
   ]
   ```

5. **Execute Schema against Production Database**:
   ```bash
   npx wrangler d1 execute master-rams-db --remote --file=./schema.sql
   ```

6. **Commit and Push Updated `wrangler.json`**:
   ```bash
   git add wrangler.json
   git commit -m "Update D1 database ID in wrangler.json"
   git push
   ```

---

### Step 3: Connect GitHub Repository to Cloudflare Workers

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. In the left menu, select **Workers & Pages** -> **Overview**.
3. Click **Create Application** -> Select **Pages** tab -> **Connect to Git**.
4. Authorize your GitHub account and select your repository `master-rams-dashboard`.
5. Click **Begin setup**.

---

### Step 4: Configure Build Settings & D1 Binding

1. **Configure Build Settings**:
   - **Project Name**: `master-rams-dashboard`
   - **Framework Preset**: `None` or `Hono`
   - **Build Command**: `npm run build` *(or leave blank if deploying directly via Workers / CLI)*
   - **Build output directory**: `public`

2. **Bind D1 Database to Cloudflare Project**:
   - In Cloudflare Dashboard, go to **Workers & Pages** -> select your deployed project **master-rams-dashboard**.
   - Navigate to **Settings** -> **Functions** (or **Bindings**).
   - Scroll to **D1 Database Bindings** and click **Add binding**.
   - Set **Variable name**: `DB` *(Must match `c.env.DB` in `src/index.ts`)*
   - Set **D1 Database**: Select `master-rams-db` from the dropdown.
   - Click **Save and Deploy**.

3. **Deploying via Wrangler CLI (Alternative direct deployment method)**:
   You can also deploy directly from your command line at any time:
   ```bash
   npx wrangler deploy
   ```

---

## 📡 API Reference

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rams` | Fetch all records from `Master_RAMS_Library` table |
| `POST` | `/api/rams` | Create a new RAMS entry (RPN auto-calculated as `S * L`) |
| `PUT` | `/api/rams/:id` | Update an existing RAMS entry by ID |
| `DELETE` | `/api/rams/:id` | Delete a RAMS entry by ID |

---

## 💡 Key Features of Admin Frontend

- **Spreadsheet Design**: High-density grid display with sticky headers and clean typography.
- **Real-Time RPN Calculator**: Automatically calculates Risk Priority Number ($RPN = Severity \times Likelihood$) as you adjust $S$ (1–5) and $L$ (1–5).
- **Dynamic Risk Level Badges**:
  - 🟢 **Low Risk**: RPN 1 – 4 (Green)
  - 🟡 **Medium Risk**: RPN 5 – 11 (Amber)
  - 🔴 **High Risk**: RPN 12 – 25 (Red)
- **Inline Row Actions**: Edit and Delete operations with standard native `fetch()` calls.
- **Interactive Column Sorting**: Clickable table headers for **ID**, **S** (Severity), **L** (Likelihood), **RPN**, Category, Activity, and Hazard with dynamic ascending/descending (`▲` / `▼`) indicator arrows.
- **Live Search**: Instant filtering across ID, category, activity, hazard, and control measures.
