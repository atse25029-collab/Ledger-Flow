-- ==========================================
-- 1. Create Customers Table
-- ==========================================
CREATE TABLE IF NOT EXISTS Customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL
);

-- ==========================================
-- 2. Create Transactions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS Transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES Customers (id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  type TEXT CHECK(type IN ('Credit', 'Payment')) NOT NULL DEFAULT 'Credit',
  status TEXT CHECK(status IN ('Pending', 'Paid')) NOT NULL,
  date TEXT NOT NULL,
  description TEXT
);

-- ==========================================
-- 3. Create FIFO Reconciliation Function
-- ==========================================
CREATE OR REPLACE FUNCTION reconcile_customer_dues(cust_id INT)
RETURNS VOID AS $$
DECLARE
  credit_id INT;
  credit_amt REAL;
  credit_desc TEXT;
  credit_date TEXT;
  
  payment_id INT;
  payment_amt REAL;
  payment_desc TEXT;
  payment_date TEXT;
  
  match_amt REAL;
BEGIN
  -- Match oldest pending credits and payments chronologically
  LOOP
    -- Get oldest pending credit
    SELECT id, amount, description, date INTO credit_id, credit_amt, credit_desc, credit_date
    FROM Transactions
    WHERE customer_id = cust_id AND type = 'Credit' AND status = 'Pending'
    ORDER BY date ASC, id ASC
    LIMIT 1;

    -- Get oldest pending payment (debit)
    SELECT id, amount, description, date INTO payment_id, payment_amt, payment_desc, payment_date
    FROM Transactions
    WHERE customer_id = cust_id AND type = 'Payment' AND status = 'Pending'
    ORDER BY date ASC, id ASC
    LIMIT 1;

    -- Exit if either has no pending transactions
    IF credit_id IS NULL OR payment_id IS NULL THEN
      EXIT;
    END IF;

    -- Reconcile amounts
    IF ABS(credit_amt - payment_amt) < 0.001 THEN
      -- Exact match: Mark both as Paid
      UPDATE Transactions SET status = 'Paid' WHERE id = credit_id;
      UPDATE Transactions SET status = 'Paid' WHERE id = payment_id;
    ELSIF credit_amt > payment_amt THEN
      -- Credit is larger: Fully clear payment, split credit
      UPDATE Transactions SET status = 'Paid' WHERE id = payment_id;
      UPDATE Transactions SET amount = payment_amt, status = 'Paid' WHERE id = credit_id;
      
      INSERT INTO Transactions (customer_id, amount, type, status, date, description)
      VALUES (
        cust_id, 
        credit_amt - payment_amt, 
        'Credit', 
        'Pending', 
        credit_date, 
        CASE WHEN credit_desc IS NOT NULL AND credit_desc <> '' THEN credit_desc || ' (Remaining Dues)' ELSE 'Remaining Dues' END
      );
    ELSE
      -- Payment is larger: Fully clear credit, split payment
      UPDATE Transactions SET status = 'Paid' WHERE id = credit_id;
      UPDATE Transactions SET amount = credit_amt, status = 'Paid' WHERE id = payment_id;
      
      INSERT INTO Transactions (customer_id, amount, type, status, date, description)
      VALUES (
        cust_id, 
        payment_amt - credit_amt, 
        'Payment', 
        'Pending', 
        payment_date, 
        CASE WHEN payment_desc IS NOT NULL AND payment_desc <> '' THEN payment_desc || ' (Unused Store Credit)' ELSE 'Unused Store Credit' END
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Create Bulk Customer/Transaction Importer
-- ==========================================
CREATE OR REPLACE FUNCTION import_customers_bulk(payload JSON)
RETURNS VOID AS $$
DECLARE
  cust_record RECORD;
  new_cust_id INT;
  credit_amt REAL;
  debit_amt REAL;
BEGIN
  FOR cust_record IN 
    SELECT * FROM json_to_recordset(payload) AS x(name TEXT, contact TEXT, credit TEXT, debit TEXT)
  LOOP
    -- Insert customer
    INSERT INTO Customers (name, contact) 
    VALUES (cust_record.name, COALESCE(cust_record.contact, ''))
    RETURNING id INTO new_cust_id;

    -- Log credit starting balance if provided
    IF cust_record.credit IS NOT NULL AND cust_record.credit <> '' THEN
      credit_amt := cust_record.credit::REAL;
      IF credit_amt > 0 THEN
        INSERT INTO Transactions (customer_id, amount, type, status, date, description)
        VALUES (new_cust_id, credit_amt, 'Credit', 'Pending', NOW()::TEXT, 'Imported Credit');
      END IF;
    END IF;

    -- Log debit starting balance if provided
    IF cust_record.debit IS NOT NULL AND cust_record.debit <> '' THEN
      debit_amt := cust_record.debit::REAL;
      IF debit_amt > 0 THEN
        INSERT INTO Transactions (customer_id, amount, type, status, date, description)
        VALUES (new_cust_id, debit_amt, 'Payment', 'Pending', NOW()::TEXT, 'Imported Payment');
      END IF;
    END IF;

    -- Run FIFO reconciliation on starting balances if both exist
    IF cust_record.credit IS NOT NULL AND cust_record.credit <> '' AND cust_record.debit IS NOT NULL AND cust_record.debit <> '' THEN
      IF credit_amt > 0 AND debit_amt > 0 THEN
        PERFORM reconcile_customer_dues(new_cust_id);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
