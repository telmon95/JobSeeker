import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GuestRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-page">
        <p className="loading-pulse">Loading...</p>
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <Outlet />;
};

export default GuestRoute;
