# LedgerFlow - Customer Dues & Credit Tracker

LedgerFlow is a high-fidelity, serverless, obsidian-themed web application for tracking customer credit, payments, outstanding balances, and monthly cash flow metrics. 

By utilizing **Supabase** directly from the frontend, this project is completely serverless. It does not require hosting an Express backend server (Render is not needed!), making it 100% free to host persistently.

---

## Key Features

1. **Obsidian-Themed Dashboard**: A modern, dark-mode glassmorphic user interface styled with custom CSS variables.
2. **Searchable Customer Dropdowns**: Autocomplete selectors for logging transactions and deletions.
3. **Automated FIFO Reconciliation Engine**: Handles partial payments using a First-In, First-Out stored procedure running natively inside PostgreSQL in a single ACID transaction block.
4. **Resilient CSV Importer/Exporter**:
   - **Export Transactions**: Download a global CSV ledger backup of all transactions logged in the database.
   - **Export Customers**: Download current customer ledgers containing name, contact, credit, debit, and outstanding balance.
   - **Bulk CSV Import**: Import customer list sheets. The database importer is extremely resilient, sanitizing encodings (BOMs, quotes, carriage returns), supports optional contact info, imports credit/debit starting balances, and runs the reconciliation engine in bulk.
5. **Grouped Bar Charts**: Dynamic SVG visualization of Credit Logged vs Debit Cleared group-bars per month over the last 6 months with rich hover details.
6. **Bulk Deletion**: Checkboxes integrated directly into the customer table to delete entries and cascading transaction history in bulk.

---

## Directory Structure

```text
credit-tracker/
├── package.json           # Workspace scripts
├── README.md              # Project documentation
├── setup_supabase.sql     # Database setup SQL script for Supabase Editor
└── frontend/              # React Client (Vite)
    ├── vite.config.js     # Vite server config
    ├── src/
    │   ├── App.jsx        # Navigation, main routing, page layout
    │   ├── index.css      # Premium obsidian design variables and styles
    │   ├── supabaseClient.js  # Supabase client initializer
    │   └── pages/
    │       ├── Dashboard.jsx        # Main ledger list, forms, and cashflow charts
    │       └── CustomerHistory.jsx  # Individual customer profiles and timeline histories
    └── package.json       # Frontend dependencies
```

---

## Setup & Deployment Guide

### 1. Database Setup (Supabase)
1. Create a free account and a new project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in the Supabase Dashboard.
3. Click **New query**, open the [setup_supabase.sql](file:///C:/Users/smoha/.gemini/antigravity/scratch/credit-tracker/setup_supabase.sql) file in your project, copy its contents, paste them into the SQL Editor, and click **Run**.
4. This creates your database tables (`Customers` and `Transactions`) and loads the transaction reconciliation procedures.

---

### 2. Local Execution (Optional)
To run the app locally:
1. Create a `.env` file inside `frontend/` containing:
   ```text
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *(Retrieve these credentials from your Supabase Dashboard under **Project Settings** > **API**).*
2. Install dependencies:
   ```bash
   npm run install:all
   ```
3. Run the development server:
   ```bash
   npm run dev:frontend
   ```

---

### 3. Production Deployment (Vercel)
1. Deploy the `frontend` folder of your repository to [Vercel](https://vercel.com).
2. Configure project environment variables on Vercel:
   * **Key**: `VITE_SUPABASE_URL`
   * **Value**: Your Supabase project URL.
   * **Key**: `VITE_SUPABASE_ANON_KEY`
   * **Value**: Your Supabase anonymous API key.
   * **Key**: `NPM_CONFIG_LEGACY_PEER_DEPS`
   * **Value**: `true` (resolves dependency warnings for React 19 libraries).
3. Click **Deploy**. Your app is live, persistent, and serverless!
