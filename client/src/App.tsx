import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';

export default function App() {
  const location = useLocation();
  const onDashboard = location.pathname === '/';

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="container masthead__inner">
          <Link to="/" className="masthead__brand link-plain">
            <span className="masthead__mark">Research Ledger</span>
            <span className="masthead__sub upper">
              Research portfolio
            </span>
          </Link>
          <nav className="masthead__nav">
            <Link to="/" className={`masthead__link ${onDashboard ? 'is-active' : ''}`}>
              Portfolio
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route
            path="*"
            element={
              <div className="container" style={{ padding: '80px 0' }}>
                <h2>Page not found</h2>
                <p className="muted">
                  <Link to="/">Return to the portfolio</Link>
                </p>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container spread">
          <span className="tiny muted">Research Ledger — a private task ledger.</span>
          <span className="tiny faint mono">v0.3</span>
        </div>
      </footer>
    </div>
  );
}
