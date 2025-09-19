import React, { useEffect, useState } from 'react';
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar';
import Chatbox from '../../components/Chatbox/Chatbox';
import RightSidebar from '../../components/RightSidebar/RightSidebar';
import { useApp } from '../../context/AppContext';
import { chatsAPI } from '../../config/api';

function Chat() {
  const { user, chats, setChats, currentChat, setCurrentChat } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await chatsAPI.getUserChats();
        setChats(response.data.chats);

        // Set the first chat as current if none is selected
        if (response.data.chats.length > 0 && !currentChat) {
          setCurrentChat(response.data.chats[0]);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadChats();
    }
  }, [user, setChats, setCurrentChat, currentChat]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#596aff] to-[#383699] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#596aff] to-[#383699] grid place-items-center">
      <div className="w-[95%] h-[75vh] max-w-[1000px] bg-[aliceblue] grid grid-cols-[1fr_2fr_1fr]">
        <LeftSidebar />
        <Chatbox />
        <RightSidebar />
      </div>
    </div>
  );
}

export default Chat;
