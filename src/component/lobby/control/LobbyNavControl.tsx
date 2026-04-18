import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "../styles.css";
const LobbyControl: React.FC = () => {
  const { openPage } = usePageManager();

  const { user, logout, askAuth, cancelAuth } = useUserManager();

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);
  const signOut = useCallback(() => {
    cancelAuth();
    logout();
  }, [logout, cancelAuth]);
  return (
    <>

      <div className="action-control" style={{ left: 0 }}>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c1" })}>
          Child1
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c2" })}>
          Child2
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c3" })}>
          Child3
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c4" })}>
          Child4
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/map" })}>
          Map
        </div>

        {user?.uid ? <div className="action-panel-item" onClick={signOut}>
          Logout
        </div> : <div className="action-panel-item" onClick={signIn}>
          SignIn
        </div>}

      </div>
    </>
  );
};


export default LobbyControl;
