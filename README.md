# LedgerFlow - Customer Dues & Credit Tracker

LedgerFlow is a high-fidelity, obsidian-themed web application for tracking customer credit, payments, outstanding balances, and monthly cash flow metrics.

This project is designed to be hosted **entirely on Vercel** (both frontend and backend) without needing any other cloud servers (no Render required!). The backend Express API runs as a Vercel Serverless Function, saving server resources and cost, while storing data permanently in a Supabase PostgreSQL instance.

---

## Key Features

1. **Obsidian-Themed Dashboard**: A modern, dark-mode glassmorphic user interface styled with custom CSS variables.
2. **Searchable Customer Dropdowns**: Autocomplete selectors for logging transactions and performing deletions.
3. **Automated FIFO Reconciliation Engine**: Handles partial payments using a First-In, First-Out algorithm in the Express backend, running under safe SQL database transactions.
4. **Resilient CSV Importer/Exporter**:
   - **Export Customers**: Download current customer ledgers containing name, contact, credit, debit, and outstanding balance.
   - **Export Transactions**: Download a global CSV ledger backup of all transactions logged in the database.
   - **Bulk CSV Import**: Import customer list sheets. The importer is extremely resilient, sanitizing encodings (BOMs, quotes, carriage returns), supports optional contact info, imports credit/debit starting balances, and executes transaction matching in a safe database transaction.
5. **Grouped Bar Charts**: Dynamic SVG visualization of Credit Logged vs Debit Cleared group-bars per month over the last 6 months with rich hover details.
6. **Bulk Deletion**: Checkboxes integrated directly into the customer table to delete entries and cascading transaction history in bulk.
7. **Hybrid Database Engine**: Automatically shifts from a local file-based database (**SQLite**) during development to a cloud relational database (**PostgreSQL/Supabase**) in production depending on environment variables.

---

## Directory Structure

```text
credit-tracker/
├── package.json           # Root workspace scripts
├── README.md              # Project documentation
├── setup_supabase.sql     # Database setup SQL script for Supabase Editor
└── frontend/              # Main project directory (Vercel Root Directory)
    ├── package.json       # App & Server dependencies
    ├── vercel.json        # Vercel Serverless Function route rewrites
    ├── vite.config.js     # Vite server config & API proxies
    ├── api/               # Express Backend Server (runs Serverless on Vercel)
    │   ├── index.js       # Vercel function entrypoint
    │   ├── server.js      # Express API endpoints
    │   └── db.js          # SQLite/PostgreSQL hybrid database connection
    └── src/
        ├── App.jsx        # Navigation, main routing, page layout
        ├── index.css      # Premium obsidian design variables and styles
        └── pages/
            ├── Dashboard.jsx        # Main ledger list, forms, and cashflow charts
            └── CustomerHistory.jsx  # Individual customer profiles and timeline histories
```

---

## Running the Project Locally

### 1. Install Dependencies
Open your terminal in the project root directory (`credit-tracker/`) and run:
```bash
npm run install:all
```
This installs the root dependencies (`concurrently`) and triggers dependency installations inside the `frontend` subfolder.

### 2. Start Development Servers
Run the following command at the root directory:
```bash
npm run dev
```
This spins up both the **Express API** (listening on port `5000`) and the **Vite Dev Server** (listening on [http://localhost:5173](http://localhost:5173)) simultaneously in local SQLite mode.

---

## Production Deployment (Vercel + Supabase)

### 1. Database Setup (Supabase)
1. Create a free project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in Supabase.
3. Click **New query**, paste the contents of [setup_supabase.sql](file:///C:/Users/smoha/.gemini/antigravity/scratch/credit-tracker/setup_supabase.sql), and click **Run**.
4. Retrieve your direct connection string under **Project Settings** > **Database** > **Connection string** (URI). Replace `[your-password]` with your database password:
   ```text
   postgresql://postgres.[id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### 2. Frontend & Backend Deployment (Vercel)
1. Import the repository into **Vercel**.
2. Configure Vercel Project Settings:
   * **Root Directory**: `frontend` (Ensure this matches the `frontend` subfolder).
   * **Framework Preset**: `Vite`
3. Expand **Environment Variables** and add:
   * **Key**: `DATABASE_URL`
   * **Value**: Your Supabase direct connection string (copied in Step 1).
   * **Key**: `NPM_CONFIG_LEGACY_PEER_DEPS`
   * **Value**: `true` (forces Vercel to bypass dependency warnings for React 19 libraries).
4. Click **Deploy**. Your app is live, persistent, and hosted 100% on Vercel!
