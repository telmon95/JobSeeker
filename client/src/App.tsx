// job-app-automator/client/src/App.tsx
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';     // 1. IMPORT
import RegisterPage from './pages/RegisterPage'; // 2. IMPORT
import './App.css';

function App() {
  return (
    <Router>
      <div>
        <nav style={{ padding: '1rem', background: '#eee', display: 'flex', gap: '1rem' }}>
          <Link to="/">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          {/* Add Login/Register links */}
          <div style={{ marginLeft: 'auto' }}>
            <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </nav>
        <main style={{ padding: '1rem' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />       {/* 3. ADD ROUTE */}
            <Route path="/register" element={<RegisterPage />} /> {/* 4. ADD ROUTE */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;