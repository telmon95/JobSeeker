import { BrowserRouter as Router, Route, Routes, NavLink, Link, useNavigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import JobDetailPage from './pages/JobDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import { useAuth } from './context/AuthContext';
import './App.css';

function AppNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="glass-nav">
      <Link to={user ? '/' : '/login'} className="brand">
        <span className="brand-mark">JS</span>
        <span className="brand-text">JobSeeker</span>
      </Link>

      {user && (
        <div className="nav-links">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </div>
      )}

      <div className="nav-actions">
        {user ? (
          <>
            <span className="nav-user">{user.email}</span>
            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn-ghost">Login</NavLink>
            <NavLink to="/register" className="btn-primary btn-primary--sm">Get Started</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-shell">
        <div className="aura-bg" aria-hidden="true">
          <div className="editorial-hero" />
        </div>

        <AppNav />

        <main className="main-content">
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
