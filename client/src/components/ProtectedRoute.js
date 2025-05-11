// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Assuming you have an auth context

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth(); // Get authentication status from your auth context

  if (!isAuthenticated) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;