import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "../map.css";
const PlayControl: React.FC = () => {
  const { askAuth, openPage } = usePageManager();
  const { user, logout } = useUserManager();
  const signIn = useCallback(() => {
    askAuth({ params: { action: "signin" } });
  }, [askAuth]);
  const signOut = useCallback(() => {
    logout();
  }, [logout]);
  return (
    <>

      <div className="action-control" style={{ left: 0 }}>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c1" })}>
          Child1
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c2" })}>
          Child2
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c3" })}>
          Child3
        </div>
        {user?.uid ? <div className="action-panel-item" onClick={signOut}>
          Logout
        </div> : <div className="action-panel-item" onClick={signIn}>
          SignIn
        </div>}
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby" })}>
          Lobby
        </div>
      </div>
    </>
  );
};


export default PlayControl;
