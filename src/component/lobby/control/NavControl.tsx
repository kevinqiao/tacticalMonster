import { PageProp } from "component/RenderApp";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { PLATFORM_TYPE, usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
import "./style.css";
const NavControl: React.FC<PageProp> = ({ close }) => {
  const { platform } = usePlatform();
  const { openPage, askAuth } = usePageManager();
  const { user, logout } = useUserManager();

  const signIn = useCallback(() => {
    askAuth({ params: { action: "signin" } });
  }, [askAuth]);
  const signOut = useCallback(async () => {
    await logout();
    close?.()
  }, [logout, close]);
  const open = useCallback(({ uri }: { uri: string }) => {
    close?.(uri);
    // openPage({ uri });
  }, [close, openPage]);
  return (
    <>
      <div className="top-nav-container" style={{ left: 0 }}>
        <div className="nav-panel-item empty" style={{ height: 50 }}></div>
        <div className="nav-panel-item" onClick={() => open({ uri: "/play/lobby/c1" })}>
          Child1
        </div>
        <div className="nav-panel-item" onClick={() => open({ uri: "/play/lobby/c2" })}>
          Child2
        </div>
        <div className="nav-panel-item" onClick={() => openPage({ uri: "/play/lobby/c3" })}>
          Child3
        </div>
        <div className="nav-panel-item" onClick={() => openPage({ uri: "/play/lobby/c4" })}>
          Child4
        </div>
        <div className="nav-panel-item" onClick={() => openPage({ uri: "/play/lobby/c3" })}>
          Child5
        </div>
        <div className="nav-panel-item" onClick={() => openPage({ uri: "/play/lobby/c4" })}>
          Child6
        </div>
        <div className="nav-panel-item" onClick={() => openPage({ uri: "/play/map" })}>
          Map
        </div>
        {platform?.type === PLATFORM_TYPE.WEB ? <>
          {user?.uid ? <div className="nav-panel-item" onClick={signOut}>
            Logout
          </div> : <div className="nav-panel-item" onClick={signIn}>
            SignIn
          </div>}
        </> : null}
      </div>
    </>
  );
};


export default NavControl;
