import db from './db.js';

async function runTests() {
  console.log('--- Database Verification Test ---');

  try {
    // 1. Add customer
    console.log('Inserting test customer...');
    const customer = await db.run(
      'INSERT INTO Customers (name, contact) VALUES (?, ?)',
      ['Test Customer', 'test@test.com']
    );
    console.log('Inserted customer ID:', customer.id);

    // 2. Insert transaction 1: Unpaid credit
    console.log('Inserting unpaid credit transaction...');
    await db.run(
      "INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)",
      [customer.id, 150.00, 'Credit', 'Pending', new Date().toISOString(), 'Credit sale for materials']
    );

    // 3. Insert transaction 2: Cleared payment (which offsets dues)
    console.log('Inserting cleared payment transaction (offset)...');
    await db.run(
      "INSERT INTO Transactions (customer_id, amount, type, status, date, description) VALUES (?, ?, ?, ?, ?, ?)",
      [customer.id, 50.00, 'Payment', 'Pending', new Date().toISOString(), 'Partial payment received']
    );

    // 4. Query customers list & outstanding dues
    console.log('Fetching customers list with dues calculations...');
    const customers = await db.all(`
      SELECT 
        c.id, 
        c.name, 
        c.contact,
        COALESCE(SUM(CASE WHEN t.type = 'Credit' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'Payment' AND t.status = 'Pending' THEN t.amount ELSE 0 END), 0) as outstanding_balance,
        COUNT(t.id) as transaction_count
      FROM Customers c
      LEFT JOIN Transactions t ON c.id = t.customer_id
      GROUP BY c.id
    `);
    
    console.log('Query results:', JSON.stringify(customers, null, 2));

    // Assert values
    const testCustomerRow = customers.find(c => c.id === customer.id);
    if (!testCustomerRow) {
      throw new Error('Test customer not found in database query!');
    }
    
    console.log('Outstanding Balance (expected: 100):', testCustomerRow.outstanding_balance);
    console.log('Transaction Count (expected: 2):', testCustomerRow.transaction_count);

    if (testCustomerRow.outstanding_balance === 100.00 && testCustomerRow.transaction_count === 2) {
      console.log('SUCCESS: Database functions and SQL queries validated successfully!');
    } else {
      console.error('FAILURE: Discrepancy in calculated totals.');
    }

    // Clean up
    console.log('Cleaning up test records...');
    await db.run('DELETE FROM Customers WHERE id = ?', [customer.id]);
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    process.exit(0);
  }
}

// Give a small delay for schema creation to complete in db.js
setTimeout(runTests, 1000);
