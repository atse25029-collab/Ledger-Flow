import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  DollarSign, 
  CheckCircle, 
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Download
} from 'lucide-react';
import { supabase } from '../supabaseClient';

function CustomerHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch customer details and transactions
  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customer details
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (custError || !customerData) {
        throw new Error('Customer profile not found');
      }

      // Fetch transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', id)
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (txError) {
        throw new Error('Failed to retrieve customer ledger details');
      }

      // Calculate outstanding balance
      let pendingCredit = 0;
      let pendingDebit = 0;
      transactionsData.forEach(tx => {
        if (tx.status === 'Pending') {
          if (tx.type === 'Credit') {
            pendingCredit += tx.amount;
          } else {
            pendingDebit += tx.amount;
          }
        }
      });

      setCustomer({
        ...customerData,
        outstanding_balance: pendingCredit - pendingDebit,
        transactions: transactionsData
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while loading this page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  // Helper to check email vs phone format
  const renderContactIcon = (contactStr) => {
    if (contactStr && contactStr.includes('@')) {
      return <Mail size={16} />;
    }
    return <Phone size={16} />;
  };

  // Client-side CSV export
  const handleExportCSV = () => {
    if (!customer || !customer.transactions) return;

    let csvContent = 'Transaction ID,Amount (INR),Type,Status,Date,Description\n';
    customer.transactions.forEach(row => {
      csvContent += `"${row.id}","${row.amount}","${row.type}","${row.status}","${row.date}","${(row.description || '').replace(/"/g, '""')}"\n`;
    });

    const safeFilename = customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${safeFilename}_ledger.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !customer) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading customer records...</div>;
  }

  if (error && !customer) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
      
      {/* Back Link & Page Title & CSV Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          
          <button 
            onClick={handleExportCSV} 
            className="btn btn-secondary btn-sm"
            title="Export this customer's ledger history to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer ID: #{id}</span>
      </div>

      {/* Top Section: Customer Profile Highlight & Summary */}
      <div className="customer-profile-card">
        <div className="profile-meta">
          <h2 className="profile-name">{customer.name}</h2>
          {customer.contact && (
            <div className="profile-contact">
              {renderContactIcon(customer.contact)}
              <span>{customer.contact}</span>
            </div>
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat-box">
            <span className="profile-stat-label">Outstanding Balance</span>
            <span className={`profile-stat-value ${customer.outstanding_balance > 0 ? 'outstanding' : ''}`}>
              ₹{customer.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="profile-stat-box" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
            <span className="profile-stat-label">Total Transactions</span>
            <span className="profile-stat-value">
              {customer.transactions.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
          <Clock size={20} />
          <span>Ledger Dues Timeline</span>
        </h3>

        {customer.transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <p>No transaction history logged for this customer yet.</p>
          </div>
        ) : (
          <div className="timeline-container">
            {customer.transactions.map((tx) => {
              const isCredit = tx.type === 'Credit';
              const formattedDate = new Date(tx.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={tx.id} className="timeline-item">
                  <div className="timeline-badge-column">
                    <div className={`timeline-badge ${isCredit ? 'credit' : 'payment'}`}>
                      {isCredit ? '+' : '-'}
                    </div>
                    <div className="timeline-connector"></div>
                  </div>
                  
                  <div className="timeline-content-card">
                    <div className="timeline-header">
                      <div className="timeline-meta-group">
                        <span className="timeline-type">{isCredit ? 'Credit Issued' : 'Payment Cleared'}</span>
                        <div className="timeline-date-group">
                          <Calendar size={12} />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`status-badge ${tx.status.toLowerCase()}`}>
                          {tx.status === 'Paid' ? 'Reconciled' : 'Pending Dues'}
                        </span>
                        <span className={`timeline-amount ${isCredit ? 'credit' : 'payment'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {tx.description && (
                      <div className="timeline-body">
                        <p>{tx.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerHistory;
