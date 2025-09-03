
import React from "react";
import "./UserListItem.css";

const UserListItem = ({ user, handleFunction }) => {
  return (
    <div onClick={handleFunction} className="user-list-item">
      <img src={user.pic} alt={user.name} />
      <div className="user-list-item-info">
        <p>{user.name}</p>
        <span>
          <b>Email : </b>
          {user.email}
        </span>
      </div>
    </div>
  );
};

export default UserListItem;
