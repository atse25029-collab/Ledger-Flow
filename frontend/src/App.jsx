import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CustomerHistory from './pages/CustomerHistory';

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
