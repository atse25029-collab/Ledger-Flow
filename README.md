# LedgerFlow - Customer Dues & Credit Tracker

LedgerFlow is a high-fidelity, obsidian-themed web application for tracking customer credit, payments, outstanding balances, and monthly cash flow metrics.

## Key Features

1. **Obsidian-Themed Dashboard**: A modern, dark-mode glassmorphic user interface styled with custom CSS variables.
2. **Searchable Customer Dropdowns**: Instant search autocomplete selectors for recording transactions and performing deletions.
3. **Robust CSV Importer/Exporter**:
   - **Export Customers**: Download current customer ledgers containing name, contact, credit, debit, and outstanding balance.
   - **Export Transactions**: Download a global CSV ledger backup of all transactions logged in the database.
   - **Bulk CSV Import**: Import customer list sheets. The importer is extremely resilient, sanitizing encodings (BOMs, quotes, carriage returns), supports optional contact info, imports credit/debit starting balances, and executes transaction matching in a safe database transaction.
4. **Grouped Bar Charts**: Dynamic SVG visualization of Credit Logged vs Debit Cleared group-bars per month over the last 6 months with rich hover details.
5. **Partial FIFO Reconciliation**: An automated first-in, first-out database reconciliation engine that splits partial credit/payment transaction blocks to maintain ledger integrity.
6. **Bulk Deletion**: Checkboxes integrated directly into the customer table to delete entries and cascading transaction history in bulk.

---

## Directory Structure

```text
credit-tracker/
├── package.json         # Workspace orchestration scripts
├── README.md            # Project documentation
├── backend/             # Express API & SQLite Database
│   ├── database.sqlite  # SQLite database storage file
│   ├── db.js            # SQLite database connection
│   ├── server.js        # Express API endpoints
│   └── package.json     # Backend server dependencies
└── frontend/            # React Client (Vite)
    ├── vite.config.js   # Vite server config and API proxies
    ├── src/
    │   ├── App.jsx      # Navigation, main routing, page layout
    │   ├── index.css    # Premium obsidian design variables and styles
    │   └── pages/
    │       ├── Dashboard.jsx        # Main ledger list, forms, and cashflow charts
    │       └── CustomerHistory.jsx  # Individual customer profiles and timeline histories
    └── package.json     # Frontend dependencies
```

---

## Running the Project Locally

### 1. Install Dependencies
Open your terminal in the project root directory (`credit-tracker/`) and run:
```bash
npm run install:all
```
This installs the root dependencies (`concurrently`) and triggers dependency installations inside both `backend` and `frontend` subfolders.

### 2. Start Development Servers
Run the following command at the root directory:
```bash
npm run dev
```
This spins up both the **Express API** (listening on port `5000`) and the **Vite Dev Server** (listening on [http://localhost:5173](http://localhost:5173)) simultaneously in SQLite mode.
