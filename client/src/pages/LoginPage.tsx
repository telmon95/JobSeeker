import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { hasParsedCv } from '../utils/cvSearchDefaults';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { _id, email: userEmail, parsedCV, token } = response.data;

      login({ user: { _id, email: userEmail, parsedCV }, token });

      if (!hasParsedCv({ parsedCV })) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true, state: { runPipeline: true } });
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      setError(message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__header">
        <span className="auth-badge">Welcome back</span>
        <h1 className="gradient-heading">Sign in</h1>
        <p className="auth-subtitle">Upload your CV → we search jobs → ranked by match</p>
      </div>

      <div className="auth-card glass-card glass-card--glow">
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>
          <PasswordInput
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
          <p className="forgot-password-link">
            <Link to="/reset-password">Forgot password?</Link>
          </p>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer-link">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
