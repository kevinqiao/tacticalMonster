import React from "react";

import { useUserManager } from "host/service/UserManager";

import "../../campaign/merchant/merchant.css";

type PartnerAdminToolbarProps = {
  partnerId?: number | null;
};

const PartnerAdminToolbar: React.FC<PartnerAdminToolbarProps> = ({ partnerId }) => {
  const { user, logout } = useUserManager();

  return (
    <div className="merchant-toolbar">
      {partnerId ? <span className="merchant-note">PID {partnerId}</span> : null}
      <div className="merchant-toolbar__actions">
        {user?.uid ? (
          <>
            <span className="merchant-note">{user.email ?? user.uid}</span>
            <button type="button" className="merchant-auth-btn" onClick={() => void logout()}>
              退出
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PartnerAdminToolbar;
