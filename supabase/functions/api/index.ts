import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { withSupabase } from 'npm:@supabase/server/adapters/hono'

const app = new Hono()

// Enable CORS for frontend clients
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  exposeHeaders: ['Content-Length', 'Content-Disposition'],
  maxAge: 600,
}))

// Apply @supabase/server middleware to inject Supabase context and clients.
// Since this is a public credit-tracker app, we use publishable credentials (apikey header).
app.use('*', withSupabase({ auth: 'publishable' }))

// 1. Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'OK', message: 'LedgerFlow Edge API is operational' })
})

// 2. Dashboard summary
app.get('/api/dashboard/summary', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  
  // Fetch active customers
  const { data: custData, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('id')
  
  if (custErr) return c.json({ error: custErr.message }, 500)
  
  // Fetch pending transactions
  const { data: txData, error: txErr } = await supabaseAdmin
    .from('transactions')
    .select('customer_id, amount, type')
    .eq('status', 'Pending')
    
  if (txErr) return c.json({ error: txErr.message }, 500)
  
  const customerDues = {}
  custData.forEach(c => {
    customerDues[c.id] = { credit: 0, debit: 0 }
  })
  
  txData.forEach(tx => {
    if (customerDues[tx.customer_id]) {
      if (tx.type === 'Credit') {
        customerDues[tx.customer_id].credit += tx.amount
      } else {
        customerDues[tx.customer_id].debit += tx.amount
      }
    }
  })
  
  let totalCredit = 0
  let totalDebit = 0
  
  Object.values(customerDues).forEach(dues => {
    const bal = dues.credit - dues.debit
    if (bal !== 0) {
      totalCredit += dues.credit
      totalDebit += dues.debit
    }
  })
  
  return c.json({
    total_credit: totalCredit,
    total_debit: totalDebit,
    net_outstanding: totalCredit - totalDebit
  })
})

// 3. GET /api/customers
app.get('/api/customers', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  
  const { data: custData, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
    
  if (custErr) return c.json({ error: custErr.message }, 500)
  
  const { data: txData, error: txErr } = await supabaseAdmin
    .from('transactions')
    .select('customer_id, amount, type')
    .eq('status', 'Pending')
    
  if (txErr) return c.json({ error: txErr.message }, 500)
  
  const customerDues = {}
  custData.forEach(c => {
    customerDues[c.id] = { credit: 0, debit: 0 }
  })
  
  txData.forEach(tx => {
    if (customerDues[tx.customer_id]) {
      if (tx.type === 'Credit') {
        customerDues[tx.customer_id].credit += tx.amount
      } else {
        customerDues[tx.customer_id].debit += tx.amount
      }
    }
  })
  
  const customerList = custData.map(c => {
    const dues = customerDues[c.id] || { credit: 0, debit: 0 }
    return {
      id: c.id,
      name: c.name,
      contact: c.contact,
      total_credit: dues.credit,
      total_debit: dues.debit,
      outstanding_balance: dues.credit - dues.debit
    }
  })
  
  return c.json(customerList)
})

// 4. POST /api/customers
app.post('/api/customers', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const body = await c.req.json()
  
  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert([{
      name: body.name.trim(),
      contact: body.contact ? body.contact.trim() : ''
    }])
    .select()
    .single()
    
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// 5. GET /api/customers/:id
app.get('/api/customers/:id', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const id = c.req.param('id')
  
  const { data: customer, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
    
  if (custErr) return c.json({ error: 'Customer profile not found' }, 404)
  
  const { data: transactions, error: txErr } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('customer_id', id)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    
  if (txErr) return c.json({ error: txErr.message }, 500)
  
  let pendingCredit = 0
  let pendingDebit = 0
  transactions.forEach(tx => {
    if (tx.status === 'Pending') {
      if (tx.type === 'Credit') {
        pendingCredit += tx.amount
      } else {
        pendingDebit += tx.amount
      }
    }
  })
  
  return c.json({
    ...customer,
    outstanding_balance: pendingCredit - pendingDebit,
    transactions
  })
})

// 6. POST /api/transactions
app.post('/api/transactions', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const body = await c.req.json()
  
  const transactionType = body.status === 'Paid' ? 'Payment' : 'Credit'
  
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert([{
      customer_id: parseInt(body.customer_id, 10),
      amount: parseFloat(body.amount),
      type: transactionType,
      status: 'Pending',
      date: body.date,
      description: body.description ? body.description.trim() : ''
    }])
    .select()
    .single()
    
  if (error) return c.json({ error: error.message }, 500)
  
  // Reconcile after logging
  await supabaseAdmin.rpc('reconcile_customer_dues', { cust_id: parseInt(body.customer_id, 10) })
  
  return c.json(data)
})

// 7. POST /api/customers/bulk-delete
app.post('/api/customers/bulk-delete', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const body = await c.req.json()
  
  const { error } = await supabaseAdmin
    .from('customers')
    .delete()
    .in('id', body.ids)
    
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// 8. PUT /api/customers/:id/reconcile
app.put('/api/customers/:id/reconcile', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const id = c.req.param('id')
  
  const { error } = await supabaseAdmin.rpc('reconcile_customer_dues', { cust_id: parseInt(id, 10) })
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// 9. POST /api/customers/import
app.post('/api/customers/import', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const body = await c.req.json()
  
  const { error } = await supabaseAdmin.rpc('import_customers_bulk', { payload: body })
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// 10. GET /api/dashboard/cashflow
app.get('/api/dashboard/cashflow', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  
  const { data: allTxs, error: cfErr } = await supabaseAdmin
    .from('transactions')
    .select('amount, type, date')
    .order('date', { ascending: true })
    
  if (cfErr) return c.json({ error: cfErr.message }, 500)
  
  const monthlyGroups = {}
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  allTxs.forEach(tx => {
    if (!tx.date) return;
    const yearMonth = tx.date.substring(0, 7)
    if (!monthlyGroups[yearMonth]) {
      const [year, monthStr] = yearMonth.split('-')
      const monthIdx = parseInt(monthStr, 10) - 1
      const monthName = monthsList[monthIdx] || monthStr
      monthlyGroups[yearMonth] = {
        label: `${monthName} ${year}`,
        credit: 0,
        debit: 0,
        sortKey: yearMonth
      }
    }
    
    if (tx.type === 'Credit') {
      monthlyGroups[yearMonth].credit += tx.amount
    } else {
      monthlyGroups[yearMonth].debit += tx.amount
    }
  })
  
  const sortedCashflow = Object.values(monthlyGroups)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-6)
    
  return c.json(sortedCashflow)
})

// 11. GET /api/transactions/export
app.get('/api/transactions/export', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('id, amount, type, status, date, description, customers(name)')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    
  if (error) return c.json({ error: error.message }, 500)
  
  let csv = 'Transaction ID,Customer Name,Amount (INR),Type,Status,Date,Description\n'
  data.forEach(row => {
    const customerName = row.customers ? row.customers.name : ''
    csv += `"${row.id}","${customerName.replace(/"/g, '""')}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`
  })
  
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename=ledger_transactions_all.csv')
  return c.text(csv)
})

// 12. GET /api/customers/export
app.get('/api/customers/export', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  
  const { data: custData, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
    
  if (custErr) return c.json({ error: custErr.message }, 500)
  
  const { data: txData, error: txErr } = await supabaseAdmin
    .from('transactions')
    .select('customer_id, amount, type')
    .eq('status', 'Pending')
    
  if (txErr) return c.json({ error: txErr.message }, 500)
  
  const customerDues = {}
  custData.forEach(c => {
    customerDues[c.id] = { credit: 0, debit: 0 }
  })
  
  txData.forEach(tx => {
    if (customerDues[tx.customer_id]) {
      if (tx.type === 'Credit') {
        customerDues[tx.customer_id].credit += tx.amount
      } else {
        customerDues[tx.customer_id].debit += tx.amount
      }
    }
  })
  
  let csv = 'Customer Name,Contact Details,Credit (INR),Debit (INR),Outstanding (INR)\n'
  custData.forEach(cust => {
    const dues = customerDues[cust.id] || { credit: 0, debit: 0 }
    csv += `"${cust.name.replace(/"/g, '""')}","${(cust.contact || '').replace(/"/g, '""')}","${dues.credit}","${dues.debit}","${dues.credit - dues.debit}"\n`
  })
  
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename=customer_ledgers.csv')
  return c.text(csv)
})

// 13. GET /api/customers/:id/export
app.get('/api/customers/:id/export', async (c) => {
  const { supabaseAdmin } = c.var.supabaseContext
  const id = c.req.param('id')
  
  const { data: customer, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('name')
    .eq('id', id)
    .single()
    
  if (custErr) return c.json({ error: 'Customer not found' }, 404)
  
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('id, amount, type, status, date, description')
    .eq('customer_id', id)
    .order('date', { ascending: false })
    
  if (error) return c.json({ error: error.message }, 500)
  
  let csv = 'Transaction ID,Amount (INR),Type,Status,Date,Description\n'
  data.forEach(row => {
    csv += `"${row.id}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`
  })
  
  const safeFilename = customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', `attachment; filename=${safeFilename}_ledger.csv`)
  return c.text(csv)
})

export default { fetch: app.fetch }
