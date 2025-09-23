import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useApp } from './context/AppContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import ProfileUpdate from './pages/ProfileUpdate';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  const { user } = useApp();

  return (
    <>
      <ToastContainer />
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
          element={!user ? <ResetPassword /> : <Navigate to="/chat" />}
        />
      </Routes>
    </>
  );
}

export default App;