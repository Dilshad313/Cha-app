import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useApp } from './context/AppContext';
import Login from './pages/Login/Login';
import Chat from './pages/Chat/Chat';
import ProfileUpdate from './pages/ProfileUpdate/ProfileUpdate';

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
      </Routes>
    </>
  );
}

export default App;