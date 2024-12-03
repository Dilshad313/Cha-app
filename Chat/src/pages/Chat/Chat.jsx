import React from 'react'
import './Chat.css'
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar'
import Chatbox from '../../components/Chatbox/Chatbox'
import RightSidebar from '../../components/RightSidebar/RightSidebar'

function Chat() {
  return (
    <div className='chat'>
        <div className="chat-container">
          <LeftSidebar/>
          <Chatbox/>
          <RightSidebar/>
        </div>
    </div>
  )
}

export default Chat