import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    // Enforce foreign key constraints
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('Failed to enable foreign keys support:', err.message);
      } else {
        console.log('Foreign key constraints enabled successfully.');
      }
    });
  }
});

// Run raw SQL helper
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Get single row helper
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Get all rows helper
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize schema
const initDb = async () => {
  try {
    // Create Customers Table
    await run(`
      CREATE TABLE IF NOT EXISTS Customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT NOT NULL
      )
    `);

    // Create Transactions Table
    await run(`
      CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT CHECK(type IN ('Credit', 'Payment')) NOT NULL DEFAULT 'Credit',
        status TEXT CHECK(status IN ('Pending', 'Paid')) NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (customer_id) REFERENCES Customers (id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database tables verified/created successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  }
};

// Run initialization
initDb();

export default {
  run,
  get,
  all
};
