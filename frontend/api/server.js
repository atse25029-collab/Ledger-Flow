import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.send('LedgerFlow API Server is running! Access the frontend via your Vercel deployment URL.');
});

// API Status Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Credit Tracker API is operational' });
});

// Helper: FIFO offset reconciliation algorithm for partial payments
async function reconcileCustomerDues(customerId) {
  // Start database transaction to ensure consistency
  await db.run('BEGIN TRANSACTION');
  try {
    // 1. Get all pending credits, oldest first
    const credits = await db.all(
      "SELECT * FROM Transactions WHERE customer_id = ? AND type = 'Credit' AND status = 'Pending' ORDER BY date ASC, id ASC",
      [customerId]
    );

    // 2. Get all pending payments (debits), oldest first
    const payments = await db.all(
      "SELECT * FROM Transactions WHERE customer_id = ? AND type = 'Payment' AND status = 'Pending' ORDER BY date ASC, id ASC",
      [customerId]
    );

    let creditIndex = 0;
    let paymentIndex = 0;

    let currentCredit = credits[creditIndex] ? { ...credits[creditIndex] } : null;
    let currentPayment = payments[paymentIndex] ? { ...payments[paymentIndex] } : null;

    const updates = []; // updates to perform on existing transactions
    const inserts = []; // new transactions to insert (remainders)

    while (currentCredit && currentPayment) {
      const creditAmt = currentCredit.amount;
      const paymentAmt = currentPayment.amount;

      if (Math.abs(creditAmt - paymentAmt) < 0.001) {
        // Exact match
        updates.push({ id: currentCredit.id, amount: creditAmt, status: 'Paid' });
        updates.push({ id: currentPayment.id, amount: paymentAmt, status: 'Paid' });

        creditIndex++;
        paymentIndex++;
        currentCredit = credits[creditIndex] ? { ...credits[creditIndex] } : null;
        currentPayment = payments[paymentIndex] ? { ...payments[paymentIndex] } : null;
      } else if (creditAmt > paymentAmt) {
        // Credit is larger than payment. Payment is fully cleared. Credit is partially cleared.
        updates.push({ id: currentPayment.id, amount: paymentAmt, status: 'Paid' });
        updates.push({ id: currentCredit.id, amount: paymentAmt, status: 'Paid' });
        
        const remainder = creditAmt - paymentAmt;
        inserts.push({
          customer_id: customerId,
          amount: remainder,
          type: 'Credit',
          status: 'Pending',
          date: currentCredit.date,
          description: currentCredit.description 
            ? `${currentCredit.description} (Remaining Dues)`
            : 'Remaining Dues'
        });

        // Payment is exhausted, move to next payment
        paymentIndex++;
        currentPayment = payments[paymentIndex] ? { ...payments[paymentIndex] } : null;

        // Credit is partially cleared, update local tracking amount for next iteration
        currentCredit.amount = remainder;
      } else {
        // Payment is larger than credit. Credit is fully cleared. Payment is partially cleared.
        updates.push({ id: currentCredit.id, amount: creditAmt, status: 'Paid' });
        updates.push({ id: currentPayment.id, amount: creditAmt, status: 'Paid' });
        
        const remainder = paymentAmt - creditAmt;
        inserts.push({
          customer_id: customerId,
          amount: remainder,
          type: 'Payment',
          status: 'Pending',
          date: currentPayment.date,
          description: currentPayment.description
            ? `${currentPayment.description} (Unused Store Credit)`
            : 'Unused Store Credit'
        });

        // Credit is exhausted, move to next credit
        creditIndex++;
        currentCredit = credits[creditIndex] ? { ...credits[creditIndex] } : null;

        // Payment is partially cleared, update local tracking amount for next iteration
        currentPayment.amount = remainder;
      }
    }

    // Execute updates
    for (const item of updates) {
      await db.run(
        'UPDATE Transactions SET amount = ?, status = ? WHERE id = ?',
        [item.amount, item.status, item.id]
      );
    }

    // Execute inserts
    for (const item of inserts) {
      await db.run(
        'INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)',
        [item.customer_id, item.amount, item.type, item.status, item.date, item.description]
      );
    }

    await db.run('COMMIT');
    return { success: true, reconciledCount: updates.length / 2 };
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

// GET /api/dashboard/summary
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // Calculate stats using a CTE that groups by customer and filters out customers with a net zero balance
    const summary = await db.get(`
      WITH CustomerBalances AS (
        SELECT 
          customer_id,
          SUM(CASE WHEN type = 'Credit' AND status = 'Pending' THEN amount ELSE 0 END) as total_credit,
          SUM(CASE WHEN type = 'Payment' AND status = 'Pending' THEN amount ELSE 0 END) as total_debit
        FROM Transactions
        GROUP BY customer_id
      )
      SELECT 
        COALESCE(SUM(total_credit), 0) as total_credit,
        COALESCE(SUM(total_debit), 0) as total_debit
      FROM CustomerBalances
      WHERE (total_credit - total_debit) <> 0
    `);

    const totalCredit = summary.total_credit || 0;
    const totalDebit = summary.total_debit || 0;

    res.json({
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_outstanding: totalCredit - totalDebit
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Database error fetching dashboard summary' });
  }
});

// GET /api/customers - List customers with outstanding dues calculated
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.all(`
      SELECT 
        c.id, 
        c.name, 
        c.contact,
        COALESCE(SUM(CASE WHEN t.type = 'Credit' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN t.type = 'Payment' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN t.type = 'Credit' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'Payment' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as outstanding_balance
      FROM Customers c
      LEFT JOIN Transactions t ON c.id = t.customer_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Database error fetching customers' });
  }
});

// POST /api/customers - Add customer
app.post('/api/customers', async (req, res) => {
  const { name, contact } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Customer Name is required.' });
  }

  try {
    const result = await db.run(
      'INSERT INTO Customers (name, contact) VALUES (?, ?)',
      [name.trim(), contact ? contact.trim() : '']
    );
    res.status(201).json({ id: result.id, name, contact });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Database error creating customer' });
  }
});

// GET /api/customers/:id - Customer details + transaction ledger
app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await db.get('SELECT * FROM Customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const transactions = await db.all(
      'SELECT * FROM Transactions WHERE customer_id = ? ORDER BY date DESC, id DESC',
      [id]
    );

    const outstandingRes = await db.get(
      `SELECT (
        SELECT COALESCE(SUM(amount), 0) FROM Transactions WHERE customer_id = ? AND type = 'Credit' AND status = 'Pending'
      ) - (
        SELECT COALESCE(SUM(amount), 0) FROM Transactions WHERE customer_id = ? AND type = 'Payment' AND status = 'Pending'
      ) as total`,
      [id, id]
    );

    res.json({
      ...customer,
      outstanding_balance: outstandingRes.total,
      transactions
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: 'Database error fetching customer details' });
  }
});

// POST /api/transactions - Log a new transaction
app.post('/api/transactions', async (req, res) => {
  const { customer_id, amount, type, status, date, description } = req.body;

  if (!customer_id || amount === undefined || !status || !date) {
    return res.status(400).json({ error: 'Customer ID, amount, status, and date are required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const parsedType = type || 'Credit';
  if (parsedType !== 'Credit' && parsedType !== 'Payment') {
    return res.status(400).json({ error: "Type must be either 'Credit' or 'Payment'." });
  }

  if (status !== 'Pending' && status !== 'Paid') {
    return res.status(400).json({ error: "Status must be either 'Pending' or 'Paid'." });
  }

  try {
    // Check if customer exists
    const customer = await db.get('SELECT id FROM Customers WHERE id = ?', [customer_id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer does not exist.' });
    }

    const result = await db.run(
      'INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [customer_id, parsedAmount, parsedType, status, date, description ? description.trim() : '']
    );

    res.status(201).json({
      id: result.id,
      customer_id,
      amount: parsedAmount,
      type: parsedType,
      status,
      date,
      description
    });
  } catch (error) {
    console.error('Error logging transaction:', error);
    res.status(500).json({ error: 'Database error logging transaction' });
  }
});

// PUT /api/transactions/:id/status - Update transaction status (Reconcile)
app.put('/api/transactions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'Pending' && status !== 'Paid') {
    return res.status(400).json({ error: "Status must be either 'Pending' or 'Paid'." });
  }

  try {
    // Check if transaction exists
    const transaction = await db.get('SELECT * FROM Transactions WHERE id = ?', [id]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    await db.run('UPDATE Transactions SET status = ? WHERE id = ?', [status, id]);
    res.json({
      ...transaction,
      status
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Database error updating transaction status' });
  }
});

// PUT /api/customers/:id/reconcile - Reconcile outstanding transactions for a customer using FIFO offset matching
app.put('/api/customers/:id/reconcile', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if customer exists
    const customer = await db.get('SELECT id FROM Customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const result = await reconcileCustomerDues(parseInt(id, 10));

    res.json({
      success: true,
      message: `Successfully reconciled customer ledger.`,
      reconciledCount: result.reconciledCount
    });
  } catch (error) {
    console.error('Error reconciling customer dues:', error);
    res.status(500).json({ error: 'Database error reconciling customer dues' });
  }
});

// DELETE /api/customers/:id - Delete customer and their transactions (cascading)
app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await db.get('SELECT id, name FROM Customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Delete customer from DB. Enforced foreign keys will delete their transactions automatically
    const result = await db.run('DELETE FROM Customers WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: `Successfully deleted customer "${customer.name}" and all associated transaction history.`,
      changes: result.changes
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Database error deleting customer' });
  }
});

// POST /api/customers/bulk-delete - Bulk delete selected customers
app.post('/api/customers/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Payload must contain an array of customer IDs.' });
  }

  await db.run('BEGIN TRANSACTION');
  try {
    for (const id of ids) {
      await db.run('DELETE FROM Customers WHERE id = ?', [id]);
    }
    await db.run('COMMIT');
    res.json({ success: true, message: `Successfully deleted ${ids.length} customers and their history.` });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error bulk deleting customers:', error);
    res.status(500).json({ error: 'Database transaction error bulk deleting customers.' });
  }
});

// GET /api/transactions/export - Export all transactions to CSV
app.get('/api/transactions/export', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        t.id, 
        c.name as customer_name, 
        t.amount, 
        t.type, 
        t.status, 
        t.date, 
        t.description 
      FROM Transactions t
      JOIN Customers c ON t.customer_id = c.id
      ORDER BY t.date DESC, t.id DESC
    `);

    let csvContent = 'Transaction ID,Customer Name,Amount (INR),Type,Status,Date,Description\n';
    rows.forEach(row => {
      csvContent += `"${row.id}","${row.customer_name.replace(/"/g, '""')}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger_transactions_all.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting transactions CSV:', error);
    res.status(500).json({ error: 'Database error exporting CSV' });
  }
});

// GET /api/customers/:id/export - Export transaction history for a single customer to CSV
app.get('/api/customers/:id/export', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await db.get('SELECT name FROM Customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const rows = await db.all(
      'SELECT id, amount, type, status, date, description FROM Transactions WHERE customer_id = ? ORDER BY date DESC, id DESC',
      [id]
    );

    let csvContent = 'Transaction ID,Amount (INR),Type,Status,Date,Description\n';
    rows.forEach(row => {
      csvContent += `"${row.id}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`;
    });

    const safeFilename = customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_ledger.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting customer CSV:', error);
    res.status(500).json({ error: 'Database error exporting CSV' });
  }
});

// GET /api/dashboard/cashflow - Get monthly aggregates for the last 6 months
app.get('/api/dashboard/cashflow', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) as credit,
        SUM(CASE WHEN type = 'Payment' THEN amount ELSE 0 END) as debit
      FROM Transactions
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
      LIMIT 6
    `);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedRows = rows.map(row => {
      if (!row.month) return null;
      const [year, monthStr] = row.month.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      const monthName = months[monthIdx] || monthStr;
      return {
        label: `${monthName} ${year}`,
        credit: row.credit || 0,
        debit: row.debit || 0
      };
    }).filter(Boolean);

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching cashflow data:', error);
    res.status(500).json({ error: 'Database error fetching cashflow data' });
  }
});

// POST /api/customers/import - Bulk import customers using SQL transaction and fail-fast validation
app.post('/api/customers/import', async (req, res) => {
  const { customers } = req.body;

  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'Payload must contain a non-empty list of customers.' });
  }

  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i];
    const rowNum = cust.rowNum || (i + 2);
    if (!cust.name || cust.name.trim() === '') {
      return res.status(400).json({ error: `Validation Error at Row ${rowNum}: Customer Name is missing or empty.` });
    }
  }

  // 2. Database transaction execution
  const customerIdsToReconcile = [];
  await db.run('BEGIN TRANSACTION');
  try {
    for (const cust of customers) {
      const result = await db.run(
        'INSERT INTO Customers (name, contact) VALUES (?, ?)',
        [cust.name.trim(), cust.contact ? cust.contact.trim() : '']
      );
      const customerId = result.id;

      let hasCredit = false;
      let hasDebit = false;

      // Import credit if provided
      if (cust.credit !== undefined && cust.credit !== null && cust.credit !== '') {
        const creditAmt = parseFloat(cust.credit);
        if (!isNaN(creditAmt) && creditAmt > 0) {
          hasCredit = true;
          await db.run(
            "INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)",
            [customerId, creditAmt, 'Credit', 'Pending', new Date().toISOString(), 'Imported Credit']
          );
        }
      }

      // Import debit if provided
      if (cust.debit !== undefined && cust.debit !== null && cust.debit !== '') {
        const debitAmt = parseFloat(cust.debit);
        if (!isNaN(debitAmt) && debitAmt > 0) {
          hasDebit = true;
          await db.run(
            "INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)",
            [customerId, debitAmt, 'Payment', 'Pending', new Date().toISOString(), 'Imported Payment']
          );
        }
      }

      if (hasCredit && hasDebit) {
        customerIdsToReconcile.push(customerId);
      }
    }
    await db.run('COMMIT');

    // Run FIFO reconciliation for each customer with both credits and debits to offset them
    for (const customerId of customerIdsToReconcile) {
      try {
        await reconcileCustomerDues(customerId);
      } catch (recErr) {
        console.error(`Error reconciling customer ID ${customerId} after import:`, recErr);
      }
    }

    res.status(201).json({ success: true, message: `Successfully imported ${customers.length} customers.` });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Database transaction error importing customers:', error);
    res.status(500).json({ error: 'Database transaction error importing customers. Batch rolled back completely.' });
  }
});

// GET /api/customers/export - Export customer ledgers list to CSV
app.get('/api/customers/export', async (req, res) => {
  try {
    const customers = await db.all(`
      SELECT 
        c.name, 
        c.contact,
        COALESCE(SUM(CASE WHEN t.type = 'Credit' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN t.type = 'Payment' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN t.type = 'Credit' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'Payment' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as outstanding_balance
      FROM Customers c
      LEFT JOIN Transactions t ON c.id = t.customer_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    let csvContent = 'Customer Name,Contact Details,Credit (INR),Debit (INR),Outstanding (INR)\n';
    customers.forEach(cust => {
      csvContent += `"${cust.name.replace(/"/g, '""')}","${cust.contact.replace(/"/g, '""')}","${cust.total_credit}","${cust.total_debit}","${cust.outstanding_balance}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customer_ledgers.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting customers list CSV:', error);
    res.status(500).json({ error: 'Database error exporting CSV' });
  }
});

// Start express server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
