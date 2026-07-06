import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

let pgPool = null;
let sqliteDb = null;
const isPostgres = !!process.env.DATABASE_URL;

const initDbConnection = async () => {
  if (isPostgres) {
    console.log('Production: Database URL detected. Initializing PostgreSQL pool...');
    const { default: pkg } = await import('pg');
    const { Pool } = pkg;
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } else {
    console.log('Local Development: Preparing local SQLite database...');
    const { default: sqlite3 } = await import('sqlite3');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err.message);
      } else {
        sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) console.error('Failed to enable foreign keys support:', err.message);
        });
      }
    });
  }
};

await initDbConnection();

// Parameter placeholder translator: SQLite ? -> PG $1, $2, ...
const translateQuery = (sql) => {
  if (!isPostgres) return sql;
  let pgSql = sql;
  let count = 1;
  while (pgSql.includes('?')) {
    pgSql = pgSql.replace('?', `$${count++}`);
  }
  // Convert sqlite3 strftime('%Y-%m', date) to pg substr(date, 1, 7) or compatible
  pgSql = pgSql.replace(/strftime\(['"]%Y-%m['"]\s*,\s*date\)/gi, 'substr(date, 1, 7)');
  return pgSql;
};

// Run helper
const run = async (sql, params = []) => {
  const translated = translateQuery(sql);
  
  if (isPostgres) {
    let pgSql = translated;
    if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
      pgSql += ' RETURNING id';
    }
    const result = await pgPool.query(pgSql, params);
    return {
      id: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(translated, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

// Get helper
const get = async (sql, params = []) => {
  const translated = translateQuery(sql);
  
  if (isPostgres) {
    const result = await pgPool.query(translated, params);
    return result.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(translated, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// All helper
const all = async (sql, params = []) => {
  const translated = translateQuery(sql);
  
  if (isPostgres) {
    const result = await pgPool.query(translated, params);
    return result.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(translated, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Schema Initialization
const initDb = async () => {
  try {
    if (isPostgres) {
      await run(`
        CREATE TABLE IF NOT EXISTS Customers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          contact TEXT NOT NULL
        )
      `);
      await run(`
        CREATE TABLE IF NOT EXISTS Transactions (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES Customers (id) ON DELETE CASCADE,
          amount REAL NOT NULL,
          type TEXT CHECK(type IN ('Credit', 'Payment')) NOT NULL DEFAULT 'Credit',
          status TEXT CHECK(status IN ('Pending', 'Paid')) NOT NULL,
          date TEXT NOT NULL,
          description TEXT
        )
      `);
    } else {
      await run(`
        CREATE TABLE IF NOT EXISTS Customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact TEXT NOT NULL
        )
      `);
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
    }
    console.log('Database schema verified/created successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  }
};

await initDb();

export default {
  run,
  get,
  all
};
