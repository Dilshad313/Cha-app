// pages/Chat.js
import React, { useEffect, useState } from 'react';
import LeftSidebar from '../components/LeftSidebar';
import Chatbox from '../components/Chatbox';
import RightSidebar from '../components/RightSidebar';
import { useApp } from '../context/AppContext';

function Chat() {
  const { user, chats, setChats, currentChat, setCurrentChat, loading, apiConnected, checkApiHealth } = useApp();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      try {
        const isHealthy = await checkApiHealth();
        if (!isHealthy) {
          setConnectionError(true);
          setChatsLoading(false);
          return;
        }

        // Your existing data loading logic
        setConnectionError(false);
        setChatsLoading(false);
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionError(true);
        setChatsLoading(false);
      }
    };

    loadInitialData();
  }, [user, retryCount, checkApiHealth]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setConnectionError(false);
    setChatsLoading(true);
  };

  // Enhanced connection error component
  const ConnectionErrorDisplay = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#596aff] to-[#383699] text-white">
      <div className="text-center p-6 bg-white/10 rounded-lg backdrop-blur-sm max-w-md mx-4">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
          <p className="text-gray-200">Unable to connect to the chat server.</p>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={handleRetry}
            className="w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-transparent border border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Refresh Page
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-300">
          <p>If this persists, check:</p>
          <ul className="text-left mt-2 space-y-1">
            <li>• Your internet connection</li>
            <li>• Server status</li>
            <li>• Browser permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (loading || chatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#596aff] to-[#383699] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading chat application...</p>
          {!apiConnected && (
            <p className="text-yellow-300 mt-2">Attempting to connect to server...</p>
          )}
        </div>
      </div>
    );
  }

  if (connectionError || !apiConnected) {
    return <ConnectionErrorDisplay />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#596aff] to-[#383699] grid place-items-center">
      <div className="w-full h-full md:w-[95%] md:h-[75vh] md:max-w-[1000px] bg-[aliceblue] grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] relative">
        <div className={`absolute top-0 left-0 h-full w-full z-20 md:static md:block ${isLeftSidebarOpen ? 'block' : 'hidden'}`}>
          <LeftSidebar closeSidebar={() => setIsLeftSidebarOpen(false)} />
        </div>
        <Chatbox 
          toggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} 
          toggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)} 
        />
        <div className={`absolute top-0 right-0 h-full w-full z-20 md:static md:block ${isRightSidebarOpen ? 'block' : 'hidden'}`}>
          <RightSidebar closeSidebar={() => setIsRightSidebarOpen(false)} />
        </div>
      </div>
    </div>
  );
}

export default Chat;