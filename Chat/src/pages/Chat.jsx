// pages/Chat.js
import React, { useEffect, useState } from 'react';
import LeftSidebar from '../components/LeftSidebar';
import Chatbox from '../components/Chatbox';
import RightSidebar from '../components/RightSidebar';
import { useApp } from '../context/AppContext';

function Chat() {
  const { user, chats, setChats, currentChat, setCurrentChat, loading, apiConnected } = useApp();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);

  useEffect(() => {
    if (!apiConnected) {
      setChatsLoading(false);
      return;
    }

    const loadInitialData = async () => {
      if (user && chats.length === 0) {
        try {
          // Chat loading will be handled by the context
          setChatsLoading(false);
        } catch (error) {
          console.error('Error loading initial data:', error);
          setChatsLoading(false);
        }
      } else {
        setChatsLoading(false);
      }
    };

    loadInitialData();
  }, [user, chats.length, apiConnected, setChats, setCurrentChat]);

  if (loading || chatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#596aff] to-[#383699] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading chat application...</p>
          {!apiConnected && (
            <p className="text-yellow-300 mt-2">Attempting to reconnect to server...</p>
          )}
        </div>
      </div>
    );
  }

  if (!apiConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#596aff] to-[#383699] text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connection Issue</h2>
          <p className="mb-4">Unable to connect to the chat server.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
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