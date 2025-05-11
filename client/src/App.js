// File: client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import Attendance from './components/Attendance';
import EditUser from './components/EditUser';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';
function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Add your navigation bar or sidebar here if needed */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/edit-user" element={<EditUser />} />
      </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;