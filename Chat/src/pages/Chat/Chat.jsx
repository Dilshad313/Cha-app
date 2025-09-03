
import LeftSidebar from "../../components/LeftSidebar/LeftSidebar";
import Chatbox from "../../components/Chatbox/Chatbox";
import RightSidebar from "../../components/RightSidebar/RightSidebar";
import { ChatState } from "../../context/AppContext";

function Chat() {
  const { user } = ChatState();

  return (
    <div className="chat">
      {user && (
        <div className="chat-container">
          <LeftSidebar />
          <Chatbox />
          <RightSidebar />
        </div>
      )}
    </div>
  );
}

export default Chat;
