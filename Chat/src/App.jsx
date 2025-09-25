import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useApp } from './context/AppContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import ProfileUpdate from './pages/ProfileUpdate';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConnectionStatus from './components/ConnectionStatus';

// A custom hook to get query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function App() {
  const { user } = useApp();
  const query = useQuery();
  const resetToken = query.get('token');

  return (
    <>
      <ToastContainer />
      <ConnectionStatus />
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/chat" /> : <Login />}
        />
        <Route
          path="/chat"
          element={user ? <Chat /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={user ? <ProfileUpdate /> : <Navigate to="/" />}
        />
        <Route
          path="/forgot-password"
          element={!user ? <ForgotPassword /> : <Navigate to="/chat" />}
        />
        <Route
          path="/reset-password"
          element={resetToken ? <ResetPassword /> : <Navigate to="/" />}
        />
      </Routes>
    </>
  );
}

export default App;