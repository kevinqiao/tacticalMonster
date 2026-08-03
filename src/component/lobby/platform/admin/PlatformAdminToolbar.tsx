import React from "react";

import { useUserManager } from "host/service/UserManager";

import "../../campaign/merchant/merchant.css";

const PlatformAdminToolbar: React.FC = () => {
  const { user, logout } = useUserManager();

  return (
    <div className="merchant-toolbar">
      <div className="merchant-toolbar__actions">
        {user?.uid ? (
          <>
            <span className="merchant-note">{user.email ?? "admin"}</span>
            <button type="button" className="merchant-auth-btn" onClick={() => void logout()}>
              退出
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PlatformAdminToolbar;
