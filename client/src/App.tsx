// job-app-automator/client/src/App.tsx

import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import './App.css'; // <-- THIS IS THE LINE THAT WAS MISSING

function App() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <div>
        <nav> {/* The CSS file will style this nav element */}
          {user && (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/profile">Profile</Link>
            </>
          )}

          <div style={{ marginLeft: 'auto' }}>
            {user ? (
              <button onClick={logout}>Logout</button>
            ) : (
              <>
                <Link to="/login" style={{ marginRight: '1rem' }}>
                  Login
                </Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;