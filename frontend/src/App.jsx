import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CustomerHistory from './pages/CustomerHistory';

// Intercept fetch and window.open to support Supabase Edge Functions without modifying other files
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  let targetUrl = url;
  if (typeof url === 'string' && url.startsWith('/api')) {
    if (apiUrl) {
      targetUrl = `${apiUrl}${url}`;
    }
    if (supabaseKey) {
      options.headers = {
        ...options.headers,
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      };
    }
  }
  return originalFetch(targetUrl, options);
};

const originalOpen = window.open;
window.open = (url, name, specs) => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  let targetUrl = url;
  if (typeof url === 'string' && url.startsWith('/api')) {
    if (apiUrl) {
      targetUrl = `${apiUrl}${url}`;
    }
    if (supabaseKey) {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}apikey=${supabaseKey}`;
    }
  }
  return originalOpen(targetUrl, name, specs);
};

// Simple Navigation Link component to handle active class manually/elegantly
function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navigation Bar */}
        <nav className="navbar">
          <Link to="/" className="logo-section">
            <BookOpen size={24} />
            <span>LedgerFlow</span>
          </Link>
          <div className="nav-links">
            <NavLink to="/">Dashboard</NavLink>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customer/:id" element={<CustomerHistory />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer>
          <p>&copy; {new Date().getFullYear()} LedgerFlow. Digital credit bookkeeping simplified.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
