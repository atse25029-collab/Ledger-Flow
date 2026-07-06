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
const API_URL = import.meta.env.VITE_API_URL || '';

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
      const res = await fetch(`${API_URL}/api/customers/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Customer profile not found');
        }
        throw new Error('Failed to retrieve customer ledger details');
      }
      const data = await res.json();
      setCustomer(data);
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
    if (contactStr.includes('@')) {
      return <Mail size={16} />;
    }
    return <Phone size={16} />;
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
            onClick={() => window.open(`/api/customers/${id}/export`)} 
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

      {/* Bottom Section: Transaction Timeline */}
      <div className="card">
        <h3 className="card-title">
          <Clock size={20} />
          <span>Ledger History Timeline</span>
        </h3>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {customer.transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 1.5rem' }}>
            <div className="empty-state-icon">
              <FileText size={28} />
            </div>
            <p className="empty-state-title">No transactions recorded yet</p>
            <p style={{ fontSize: '0.9rem' }}>Go back to the dashboard to log a credit sale or cleared payment for this customer.</p>
          </div>
        ) : (
          <div className="timeline">
            {customer.transactions.map((tx) => {
              // Format date and time (e.g., July 2, 2026, 1:45 PM)
              const formattedDate = new Date(tx.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });

              const isPayment = tx.type === 'Payment';
              const formattedAmount = isPayment 
                ? `-₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `₹${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

              return (
                <div key={tx.id} className="timeline-item">
                  <div className="timeline-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span 
                        className="timeline-amount" 
                        style={{ color: isPayment ? 'var(--color-success)' : 'var(--text-primary)' }}
                      >
                        {formattedAmount}
                      </span>
                      <span className={`badge ${tx.status === 'Paid' ? 'badge-paid' : (isPayment ? 'badge-paid' : 'badge-pending')}`}>
                        {isPayment 
                          ? (tx.status === 'Paid' ? 'Reconciled Payment' : 'Payment Offset') 
                          : (tx.status === 'Paid' ? 'Paid' : 'Pending Dues')}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                      <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                      <span className="timeline-date">{formattedDate}</span>
                    </div>

                    {tx.description && (
                      <p className="timeline-desc" style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-muted)' }}>Note:</span> {tx.description}
                      </p>
                    )}
                  </div>

                  <div className="timeline-right">
                    {/* Reconcile actions are handled through bulk dashboard triggers, keeping history clean */}
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
