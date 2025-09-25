// components/ConnectionStatus.jsx
import React from 'react';
import { useApp } from '../context/AppContext';

const ConnectionStatus = () => {
  const { apiConnected } = useApp();

  if (apiConnected) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full"></div>
        <span className="text-sm font-medium">Disconnected</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;