import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import { EditableText } from './components/detail/EditableText';
import { useSettings } from './lib/settings';

const DEFAULT_BRAND = 'Research portfolio';

export default function App() {
  const location = useLocation();
  const onDashboard = location.pathname === '/';
  const { settings, patch } = useSettings();

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="container masthead__inner">
          <div className="masthead__brand">
            <Link to="/" className="masthead__mark link-plain">
              Research Ledger
            </Link>
            <EditableText
              tag="span"
              className="masthead__sub upper"
              value={settings?.brandLine || DEFAULT_BRAND}
              emptyText={DEFAULT_BRAND}
              ariaLabel="Header tagline"
              onCommit={(v) => void patch({ brandLine: v || null })}
            />
          </div>
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
