import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  PlusCircle, 
  TrendingUp, 
  Search, 
  BookOpen, 
  ArrowRight,
  AlertCircle,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// Custom SVG Grouped Bar Chart for Monthly Cash Flow
function CashFlowChart({ data }) {
  const width = 600;
  const height = 180;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find max value in data to scale height
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.credit, d.debit)),
    100 // default min height scale
  );

  // Round maxVal to a clean interval
  const roundMaxVal = Math.ceil(maxVal / 100) * 100;

  // Get bar groups positions
  const numGroups = data.length;
  const groupWidth = chartWidth / numGroups;
  const barWidth = Math.min(16, groupWidth / 2.8);

  const getBarHeight = (value) => {
    return (value / roundMaxVal) * chartHeight;
  };

  // State for hovered bar data to show tooltip
  const [hoveredBar, setHoveredBar] = useState(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        {/* Y Axis Grid Lines & Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + chartHeight - ratio * chartHeight;
          const val = ratio * roundMaxVal;
          return (
            <g key={ratio}>
              {/* Grid Line */}
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border-color)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              {/* Label */}
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-main)"
              >
                ₹{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}

        {/* X Axis Line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="var(--border-color)"
          strokeWidth="1"
        />

        {/* Group Bars & Labels */}
        {data.map((d, index) => {
          const groupX = paddingLeft + index * groupWidth;
          const labelX = groupX + groupWidth / 2;

          // X coordinates for the credit and debit bars inside the group
          const creditBarX = labelX - barWidth - 3;
          const debitBarX = labelX + 3;

          const creditHeight = getBarHeight(d.credit);
          const debitHeight = getBarHeight(d.debit);

          const creditBarY = paddingTop + chartHeight - creditHeight;
          const debitBarY = paddingTop + chartHeight - debitHeight;

          return (
            <g key={d.label}>
              {/* Group Hover highlight */}
              <rect
                x={groupX + 5}
                y={paddingTop}
                width={groupWidth - 10}
                height={chartHeight}
                fill="rgba(255, 255, 255, 0.01)"
                onMouseEnter={() => setHoveredBar({
                  month: d.label,
                  credit: d.credit,
                  debit: d.debit,
                  x: labelX,
                  y: Math.min(creditBarY, debitBarY) - 10
                })}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: 'pointer' }}
              />

              {/* Credit Bar (Red) */}
              <rect
                x={creditBarX}
                y={creditBarY}
                width={barWidth}
                height={creditHeight}
                rx="3"
                fill="var(--color-danger)"
                opacity="0.85"
                style={{ transition: 'height 0.4s ease-out, y 0.4s ease-out' }}
              />

              {/* Debit Bar (Green) */}
              <rect
                x={debitBarX}
                y={debitBarY}
                width={barWidth}
                height={debitHeight}
                rx="3"
                fill="var(--color-success)"
                opacity="0.85"
                style={{ transition: 'height 0.4s ease-out, y 0.4s ease-out' }}
              />

              {/* X Axis Label */}
              <text
                x={labelX}
                y={paddingTop + chartHeight + 18}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="10.5"
                fontWeight="500"
                fontFamily="var(--font-main)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredBar && (
        <div style={{
          position: 'absolute',
          left: `${(hoveredBar.x / width) * 100}%`,
          top: `${(hoveredBar.y / height) * 100 - 15}%`,
          transform: 'translateX(-50%) translateY(-100%)',
          backgroundColor: 'var(--bg-card-hover)',
          border: '1px solid var(--border-color-hover)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 0.75rem',
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          minWidth: '130px',
          transition: 'all 0.15s ease-out'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
            {hoveredBar.month}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Credit:</span>
            <span style={{ fontWeight: '600', color: 'var(--color-danger)' }}>₹{hoveredBar.credit.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Debit:</span>
            <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>₹{hoveredBar.debit.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem' }}>
            <span>Net Flow:</span>
            <span style={{ 
              fontWeight: '700', 
              color: (hoveredBar.credit - hoveredBar.debit) >= 0 ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              ₹{(hoveredBar.credit - hoveredBar.debit).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  
  // Data State
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total_credit: 0,
    total_debit: 0,
    net_outstanding: 0
  });
  const [cashflowData, setCashflowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);

  // Searchable Customer Dropdown State (Transaction Form)
  const [custSearch, setCustSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Searchable Customer Dropdown State (Deletion Form)
  const [deleteCustSearch, setDeleteCustSearch] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // CSV Import State
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Active form tab: 'transaction', 'customer', or 'deleteCustomer'
  const [activeTab, setActiveTab] = useState('transaction');

  // Customer Form State
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '' });
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerSuccess, setCustomerSuccess] = useState(false);

  // Get current local date and time formatted for datetime-local input
  const getLocalDatetimeString = () => {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  // Transaction Form State
  const [newTransaction, setNewTransaction] = useState({
    customer_id: '',
    amount: '',
    status: 'Pending', // default to unpaid credit
    date: getLocalDatetimeString(),
    description: ''
  });
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (custErr) throw new Error(custErr.message || 'Failed to fetch customers list');

      // 2. Fetch pending transactions
      const { data: pendingTxs, error: txErr } = await supabase
        .from('transactions')
        .select('customer_id, amount, type')
        .eq('status', 'Pending');

      if (txErr) throw new Error(txErr.message || 'Failed to fetch transactions');

      // Calculate totals per customer
      const customerDues = {};
      custData.forEach(c => {
        customerDues[c.id] = { credit: 0, debit: 0 };
      });

      pendingTxs.forEach(tx => {
        if (customerDues[tx.customer_id]) {
          if (tx.type === 'Credit') {
            customerDues[tx.customer_id].credit += tx.amount;
          } else {
            customerDues[tx.customer_id].debit += tx.amount;
          }
        }
      });

      // Calculate stats for active customers only (where outstanding !== 0)
      let globalCredit = 0;
      let globalDebit = 0;

      const customerList = custData.map(c => {
        const dues = customerDues[c.id] || { credit: 0, debit: 0 };
        const bal = dues.credit - dues.debit;
        
        if (bal !== 0) {
          globalCredit += dues.credit;
          globalDebit += dues.debit;
        }

        return {
          id: c.id,
          name: c.name,
          contact: c.contact,
          total_credit: dues.credit,
          total_debit: dues.debit,
          outstanding_balance: bal
        };
      });

      setCustomers(customerList);
      setStats({
        total_credit: globalCredit,
        total_debit: globalDebit,
        net_outstanding: globalCredit - globalDebit
      });

      // 3. Fetch cashflow aggregates (last 6 months)
      const { data: allTxs, error: cfErr } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .order('date', { ascending: true });

      if (cfErr) throw new Error(cfErr.message || 'Failed to fetch cashflow data');

      const monthlyGroups = {};
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      allTxs.forEach(tx => {
        if (!tx.date) return;
        const yearMonth = tx.date.substring(0, 7); // e.g. "2026-07"
        if (!monthlyGroups[yearMonth]) {
          const [year, monthStr] = yearMonth.split('-');
          const monthIdx = parseInt(monthStr, 10) - 1;
          const monthName = monthsList[monthIdx] || monthStr;
          monthlyGroups[yearMonth] = {
            label: `${monthName} ${year}`,
            credit: 0,
            debit: 0,
            sortKey: yearMonth
          };
        }
        
        if (tx.type === 'Credit') {
          monthlyGroups[yearMonth].credit += tx.amount;
        } else {
          monthlyGroups[yearMonth].debit += tx.amount;
        }
      });

      const sortedCashflow = Object.values(monthlyGroups)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .slice(-6);

      setCashflowData(sortedCashflow);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle adding a new customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;

    setCustomerSubmitting(true);
    setCustomerSuccess(false);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name.trim(),
          contact: newCustomer.contact ? newCustomer.contact.trim() : ''
        }])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message || 'Failed to create customer');

      setCustomerSuccess(true);
      setNewCustomer({ name: '', contact: '' });
      
      // Auto-switch to transaction tab and select this customer
      setNewTransaction(prev => ({ ...prev, customer_id: data.id.toString() }));
      
      // Refresh data
      await fetchDashboardData();
      
      setTimeout(() => {
        setCustomerSuccess(false);
        setActiveTab('transaction');
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setCustomerSubmitting(false);
    }
  };

  // Handle logging a new transaction
  const handleLogTransaction = async (e) => {
    e.preventDefault();
    const { customer_id, amount, status, date, description } = newTransaction;
    if (!customer_id || !amount || parseFloat(amount) <= 0) return;

    setTransactionSubmitting(true);
    setTransactionSuccess(false);
    setError(null);

    const transactionType = status === 'Paid' ? 'Payment' : 'Credit';

    try {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          customer_id: parseInt(customer_id, 10),
          amount: parseFloat(amount),
          type: transactionType,
          status: 'Pending', // always start as pending for calculations until reconciled
          date,
          description: description ? description.trim() : ''
        }]);

      if (insertError) throw new Error(insertError.message || 'Failed to record transaction');

      setTransactionSuccess(true);
      setNewTransaction(prev => ({
        ...prev,
        amount: '',
        date: getLocalDatetimeString(),
        description: ''
      }));

      // Refresh data
      await fetchDashboardData();

      setTimeout(() => setTransactionSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTransactionSubmitting(false);
    }
  };

  // Handle deleting a customer
  const handleDeleteCustomer = async (e) => {
    e.preventDefault();
    if (!customerToDeleteId) return;

    const selectedDeleteCust = customers.find(c => c.id.toString() === customerToDeleteId);
    if (!selectedDeleteCust) return;

    const outstandingMsg = selectedDeleteCust.outstanding_balance !== 0
      ? ` Warning: This customer currently has a net balance of ₹${selectedDeleteCust.outstanding_balance.toFixed(2)}.`
      : '';

    if (!window.confirm(`Are you absolutely sure you want to delete "${selectedDeleteCust.name}"?${outstandingMsg}\n\nThis will permanently delete their profile and ALL of their transaction ledger history. This action cannot be undone.`)) {
      return;
    }

    setDeleteSubmitting(true);
    setDeleteSuccess(false);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDeleteId);

      if (deleteError) throw new Error(deleteError.message || 'Failed to delete customer');

      setDeleteSuccess(true);
      setCustomerToDeleteId('');
      setDeleteCustSearch('');

      // Refresh data
      await fetchDashboardData();

      setTimeout(() => setDeleteSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Handle quick reconciliation (paying off all customer dues)
  const handleReconcileAll = async (customerId, customerName) => {
    if (!window.confirm(`Mark all outstanding dues for ${customerName} as Paid?`)) {
      return;
    }

    try {
      setError(null);
      const { error: rpcError } = await supabase.rpc('reconcile_customer_dues', { cust_id: customerId });
      if (rpcError) throw new Error(rpcError.message || 'Failed to reconcile dues');

      // Refresh data
      await fetchDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle client-side CSV parsing & bulk import submission
  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvImporting(true);
    setCsvError(null);
    setCsvSuccess(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        
        // Split lines
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) {
          throw new Error('The selected CSV file is empty.');
        }

        const sanitizeHeader = (h) => {
          return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        const headers = lines[0].split(',').map(sanitizeHeader);
        
        // Find indices dynamically - supporting the exact format of the exported CSV with extreme resilience
        const nameColIndex = headers.findIndex(sh => sh === 'customername' || sh.includes('name'));
        const contactColIndex = headers.findIndex(sh => sh === 'contactdetails' || sh.includes('contact') || sh.includes('details') || sh.includes('phone') || sh.includes('email'));
        const creditColIndex = headers.findIndex(sh => sh === 'creditinr' || sh === 'credit' || sh.includes('credit'));
        const debitColIndex = headers.findIndex(sh => sh === 'debitinr' || sh === 'debit' || sh.includes('debit'));

        if (nameColIndex === -1) {
          throw new Error('CSV is missing the "Customer Name" column header.');
        }

        const parsedCustomers = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const nameVal = (values[nameColIndex] || '').replace(/^["']|["']$/g, '').trim();
          const contactVal = contactColIndex !== -1
            ? (values[contactColIndex] || '').replace(/^["']|["']$/g, '').trim()
            : '';
          const creditVal = creditColIndex !== -1
            ? (values[creditColIndex] || '').replace(/[^0-9.]/g, '')
            : '';
          const debitVal = debitColIndex !== -1
            ? (values[debitColIndex] || '').replace(/[^0-9.]/g, '')
            : '';

          if (nameVal) {
            parsedCustomers.push({
              name: nameVal,
              contact: contactVal,
              credit: creditVal,
              debit: debitVal
            });
          }
        }

        // Post mapped JSON payload to Supabase bulk importer RPC
        const { error: rpcError } = await supabase.rpc('import_customers_bulk', { payload: parsedCustomers });

        if (rpcError) {
          throw new Error(rpcError.message || 'Failed to complete CSV import.');
        }

        setCsvSuccess(true);
        // Refresh dashboard customer list
        await fetchDashboardData();
        
        setTimeout(() => setCsvSuccess(false), 3000);
      } catch (err) {
        console.error(err);
        setCsvError(err.message);
      } finally {
        setCsvImporting(false);
        e.target.value = ''; // Wipes file value
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read file from disk.');
      setCsvImporting(false);
    };

    reader.readAsText(file);
  };

  // Filter customers by search query and activeOnly checkbox
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      customer.name.toLowerCase().includes(query) ||
      (customer.contact || '').toLowerCase().includes(query);
    
    if (activeOnly) {
      // Show only customers whose net outstanding balance is not exactly 0
      return matchesSearch && customer.outstanding_balance !== 0;
    }
    return matchesSearch;
  });

  // Whenever the filtered list of customers changes, filter our selections so we don't hold selected references to hidden rows
  useEffect(() => {
    setSelectedCustomerIds(prev => prev.filter(id => filteredCustomers.some(c => c.id === id)));
  }, [searchQuery, activeOnly, customers]);

  // Handle bulk deleting selected customers
  const handleBulkDelete = async () => {
    const count = selectedCustomerIds.length;
    if (!window.confirm(`Are you absolutely sure you want to delete the ${count} selected customers? This will permanently delete their profiles and all associated transaction histories.`)) {
      return;
    }

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedCustomerIds);

      if (deleteError) throw new Error(deleteError.message || 'Failed to bulk delete customers');

      setSelectedCustomerIds([]);
      await fetchDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Autocomplete filtered options (Transaction Form)
  const filteredOptions = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(custSearch.toLowerCase())
  );

  // Autocomplete filtered options (Deletion Form)
  const filteredDeleteOptions = customers.filter(c => 
    c.name.toLowerCase().includes(deleteCustSearch.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(deleteCustSearch.toLowerCase())
  );

  const selectedCustomerObj = customers.find(c => c.id.toString() === newTransaction.customer_id);
  const selectedDeleteCustomerObj = customers.find(c => c.id.toString() === customerToDeleteId);

  // Client-side CSV generation & download (Transactions)
  const handleExportTransactions = async () => {
    try {
      const { data, error: selectError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          status,
          date,
          description,
          customers (
            name
          )
        `)
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (selectError) throw new Error(selectError.message || 'Failed to fetch transactions');

      let csvContent = 'Transaction ID,Customer Name,Amount (INR),Type,Status,Date,Description\n';
      data.forEach(row => {
        const customerName = row.customers ? row.customers.name : '';
        csvContent += `"${row.id}","${customerName.replace(/"/g, '""')}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "ledger_transactions_all.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(err.message);
    }
  };

  // Client-side CSV generation & download (Customers list)
  const handleExportCustomers = () => {
    let csvContent = 'Customer Name,Contact Details,Credit (INR),Debit (INR),Outstanding (INR)\n';
    customers.forEach(cust => {
      csvContent += `"${cust.name.replace(/"/g, '""')}","${(cust.contact || '').replace(/"/g, '""')}","${cust.total_credit}","${cust.total_debit}","${cust.outstanding_balance}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "customer_ledgers.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Page Title */}
      <div className="page-header">
        <h1 className="page-title">Ledger Overview</h1>
        <p className="page-subtitle">Track outstanding customer balances, record payments, and manage credits.</p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon outstanding" style={{ backgroundColor: 'rgba(244, 63, 94, 0.08)', color: 'var(--color-danger)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Credit</span>
            <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
              ₹{stats.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon reconciled" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Debit</span>
            <span className="stat-value" style={{ color: 'var(--color-success)' }}>
              ₹{stats.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon debtors" style={{ 
            backgroundColor: stats.net_outstanding > 0 ? 'rgba(244, 63, 94, 0.08)' : (stats.net_outstanding < 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)'),
            color: stats.net_outstanding > 0 ? 'var(--color-danger)' : (stats.net_outstanding < 0 ? 'var(--color-success)' : 'var(--text-muted)') 
          }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Net Outstanding</span>
            <span className="stat-value" style={{ color: stats.net_outstanding > 0 ? 'var(--color-danger)' : (stats.net_outstanding < 0 ? 'var(--color-success)' : 'var(--text-muted)') }}>
              ₹{stats.net_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Chart Card */}
      {cashflowData.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-title-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 className="card-title">
              <TrendingUp size={20} />
              <span>Monthly Business Volume (Last 6 Months)</span>
            </h3>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', fontWeight: '500' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>Credit Logged</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>Debit Cleared</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CashFlowChart data={cashflowData} />
          </div>
        </div>
      )}

      {/* Main Grid: Ledger & Entry Forms */}
      <div className="dashboard-grid">
        
        {/* Left Side: Ledger Summary */}
        <div className="card">
          <div className="card-title-section">
            <h3 className="card-title">
              <BookOpen size={20} />
              <span>Customer Ledgers</span>
            </h3>
            
            {/* Search, Checkbox, and Export buttons */}
            <div className="search-filter-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Active Ledgers Only</span>
              </label>

              <div style={{ position: 'relative', width: '200px' }}>
                <Search 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                {selectedCustomerIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="btn btn-primary btn-sm"
                    style={{ 
                      backgroundColor: 'var(--color-danger-bg)', 
                      borderColor: 'var(--color-danger-border)',
                      color: 'var(--color-danger)',
                      height: '36px',
                      marginRight: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-danger)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
                      e.currentTarget.style.color = 'var(--color-danger)';
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedCustomerIds.length})</span>
                  </button>
                )}

                <button
                  onClick={handleExportTransactions}
                  className="btn btn-secondary btn-sm"
                  title="Export all transactions to CSV"
                  style={{ height: '36px' }}
                >
                  <Download size={14} />
                  <span>Export Transactions</span>
                </button>

                <button
                  onClick={handleExportCustomers}
                  className="btn btn-secondary btn-sm"
                  title="Export all customer profiles to CSV"
                  style={{ height: '36px' }}
                >
                  <Download size={14} />
                  <span>Export Customers</span>
                </button>
              </div>
            </div>
          </div>

          {loading && customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users size={28} />
              </div>
              <p className="empty-state-title">No customers found</p>
              <p style={{ fontSize: '0.9rem' }}>
                {searchQuery 
                  ? 'Try adjusting your search criteria' 
                  : (activeOnly ? 'No active accounts. Uncheck "Active Ledgers Only" to see historical customers.' : 'Get started by adding a customer from the right panel.')}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px', paddingRight: 0 }}>
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomerIds(filteredCustomers.map(c => c.id));
                          } else {
                            setSelectedCustomerIds([]);
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Customer Name</th>
                    <th>Contact Details</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.id}
                      style={{ 
                        backgroundColor: selectedCustomerIds.includes(customer.id) 
                          ? 'rgba(163, 112, 247, 0.08)' 
                          : 'transparent'
                      }}
                    >
                      <td style={{ width: '40px', paddingRight: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomerIds(prev => [...prev, customer.id]);
                            } else {
                              setSelectedCustomerIds(prev => prev.filter(id => id !== customer.id));
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ fontWeight: '600' }}>{customer.name}</td>
                      <td>{customer.contact || '-'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                        ₹{customer.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                        ₹{customer.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: '700', 
                        color: customer.outstanding_balance > 0 ? 'var(--color-danger)' : (customer.outstanding_balance < 0 ? 'var(--color-success)' : 'var(--text-muted)') 
                      }}>
                        ₹{customer.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => navigate(`/customer/${customer.id}`)}
                            className="btn btn-secondary btn-sm"
                          >
                            <span>Ledger History</span>
                            <ArrowRight size={14} />
                          </button>
                          
                          {customer.outstanding_balance !== 0 && (
                            <button
                              onClick={() => handleReconcileAll(customer.id, customer.name)}
                              className="btn btn-success btn-sm"
                            >
                              <CheckCircle size={14} />
                              <span>Reconcile</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Form */}
        <div className="card">
          <div className="tabs-container">
            <button
              onClick={() => setActiveTab('transaction')}
              className={`tab-btn ${activeTab === 'transaction' ? 'active' : ''}`}
            >
              Log Transaction
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            >
              Add Customer
            </button>
            <button
              onClick={() => setActiveTab('deleteCustomer')}
              className={`tab-btn ${activeTab === 'deleteCustomer' ? 'active' : ''}`}
            >
              Delete Customer
            </button>
          </div>

          {/* TAB 1: LOG TRANSACTION FORM */}
          {activeTab === 'transaction' && (
            <form onSubmit={handleLogTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {transactionSuccess && (
                <div className="alert alert-success">
                  <CheckCircle size={16} />
                  <span>Transaction logged successfully!</span>
                </div>
              )}

              {/* Custom Searchable Customer Dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Select Customer</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder={selectedCustomerObj ? selectedCustomerObj.name : "Search & select customer..."}
                    value={isOpen ? custSearch : (selectedCustomerObj ? selectedCustomerObj.name : '')}
                    onFocus={() => {
                      setIsOpen(true);
                      setCustSearch(''); // Clear input text to show all options initially
                    }}
                    onBlur={() => {
                      // Small delay to allow the onClick handler of list elements to execute before dropdown closes
                      setTimeout(() => setIsOpen(false), 200);
                    }}
                    onChange={(e) => setCustSearch(e.target.value)}
                    style={{ cursor: 'pointer', paddingRight: '2rem' }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem'
                  }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {isOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color-hover)',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 200,
                    boxShadow: 'var(--shadow-lg)',
                    marginTop: '4px'
                  }}>
                    {filteredOptions.length === 0 ? (
                      <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No customers found
                      </div>
                    ) : (
                      filteredOptions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setNewTransaction(prev => ({ ...prev, customer_id: c.id.toString() }));
                            setIsOpen(false);
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            fontSize: '0.9rem',
                            transition: 'var(--transition-smooth)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {c.contact ? `${c.contact} ` : ''}{c.outstanding_balance !== 0 ? `| Balance: ₹${c.outstanding_balance.toFixed(2)}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                
                <div className="form-group">
                  <label>Transaction Type</label>
                  <select
                    required
                    value={newTransaction.status}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Pending">Credit</option>
                    <option value="Paid">Debit</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Transaction Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Description / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #2031, grocery supplies"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={transactionSubmitting || customers.length === 0}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
              >
                <PlusCircle size={18} />
                <span>{transactionSubmitting ? 'Logging...' : 'Record Transaction'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: ADD NEW CUSTOMER FORM */}
          {activeTab === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {customerSuccess && (
                  <div className="alert alert-success">
                    <CheckCircle size={16} />
                    <span>Customer created successfully!</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Contact Details (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Phone number or email address"
                    value={newCustomer.contact}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, contact: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={customerSubmitting}
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                >
                  <PlusCircle size={18} />
                  <span>{customerSubmitting ? 'Creating...' : 'Create Customer Record'}</span>
                </button>
              </form>

              {/* CSV Importer Separator Block */}
              <div style={{ 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem' 
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Or Bulk Import via CSV
                </div>

                {csvSuccess && (
                  <div className="alert alert-success">
                    <CheckCircle size={16} />
                    <span>All CSV customers imported successfully!</span>
                  </div>
                )}

                {csvError && (
                  <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>{csvError}</span>
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    id="csv-file-uploader"
                    style={{ display: 'none' }}
                    disabled={csvImporting}
                  />
                  <label
                    htmlFor="csv-file-uploader"
                    className="btn btn-secondary"
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      cursor: csvImporting ? 'not-allowed' : 'pointer',
                      opacity: csvImporting ? 0.6 : 1
                    }}
                  >
                    <Upload size={16} />
                    <span>{csvImporting ? 'Importing CSV...' : 'Upload CSV Customer Sheet'}</span>
                  </label>
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
                  Ensure your CSV is formatted exactly like the app's export (must contain <strong>"Customer Name"</strong> and <strong>"Contact Details"</strong> columns).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: DELETE CUSTOMER FORM */}
          {activeTab === 'deleteCustomer' && (
            <form onSubmit={handleDeleteCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {deleteSuccess && (
                <div className="alert alert-success">
                  <CheckCircle size={16} />
                  <span>Customer deleted successfully!</span>
                </div>
              )}

              {/* Custom Searchable Customer Dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Search Customer to Delete</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required={!customerToDeleteId}
                    placeholder={selectedDeleteCustomerObj ? selectedDeleteCustomerObj.name : "Type to search customer..."}
                    value={isDeleteOpen ? deleteCustSearch : (selectedDeleteCustomerObj ? selectedDeleteCustomerObj.name : '')}
                    onFocus={() => {
                      setIsDeleteOpen(true);
                      setDeleteCustSearch('');
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsDeleteOpen(false), 200);
                    }}
                    onChange={(e) => setDeleteCustSearch(e.target.value)}
                    style={{ cursor: 'pointer', paddingRight: '2rem' }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem'
                  }}>
                    {isDeleteOpen ? '▲' : '▼'}
                  </span>
                </div>

                {isDeleteOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color-hover)',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 200,
                    boxShadow: 'var(--shadow-lg)',
                    marginTop: '4px'
                  }}>
                    {filteredDeleteOptions.length === 0 ? (
                      <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No customers found
                      </div>
                    ) : (
                      filteredDeleteOptions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCustomerToDeleteId(c.id.toString());
                            setIsDeleteOpen(false);
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            fontSize: '0.9rem',
                            transition: 'var(--transition-smooth)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {c.contact ? `${c.contact} ` : ''}{c.outstanding_balance !== 0 ? `| Balance: ₹${c.outstanding_balance.toFixed(2)}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customer details preview */}
              {selectedDeleteCustomerObj && (
                <div style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.04)',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                    Profile Preview
                  </div>
                  <div><strong>Name:</strong> {selectedDeleteCustomerObj.name}</div>
                  <div><strong>Contact:</strong> {selectedDeleteCustomerObj.contact || '-'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    <div>Credit: ₹{selectedDeleteCustomerObj.total_credit.toFixed(2)}</div>
                    <div>Debit: ₹{selectedDeleteCustomerObj.total_debit.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: '600', marginTop: '0.25rem', color: selectedDeleteCustomerObj.outstanding_balance > 0 ? 'var(--color-danger)' : (selectedDeleteCustomerObj.outstanding_balance < 0 ? 'var(--color-success)' : 'var(--text-muted)') }}>
                    Outstanding: ₹{selectedDeleteCustomerObj.outstanding_balance.toFixed(2)}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={deleteSubmitting || !customerToDeleteId}
                className="btn btn-primary"
                style={{ 
                  marginTop: '0.5rem', 
                  backgroundColor: 'var(--color-danger-bg)', 
                  borderColor: 'var(--color-danger-border)',
                  color: 'var(--color-danger)'
                }}
                onMouseEnter={(e) => {
                  if (customerToDeleteId) {
                    e.currentTarget.style.backgroundColor = 'var(--color-danger)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
                  e.currentTarget.style.color = 'var(--color-danger)';
                }}
              >
                <Trash2 size={18} />
                <span>{deleteSubmitting ? 'Deleting...' : 'Delete Customer Profile'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
