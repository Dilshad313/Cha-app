
import React from "react";
import "./Chatbox.css";
import { ChatState } from "../../context/AppContext";
import SingleChat from "../SingleChat";

function Chatbox() {
  const { selectedChat } = ChatState();

  return (
    <div className={`chat-box ${selectedChat ? "selected" : ""}`}>
      <SingleChat />
    </div>
  );
}

export default Chatbox;
