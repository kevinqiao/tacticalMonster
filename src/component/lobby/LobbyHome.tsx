import OpponentSearch from "component/play/match/OpponentSearch";
import { SlideNavProvider } from "component/SlideNavManager";
import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";
import LobbyContent from "./LobbyContent";
import MenuNav from "./menunav/MenuNav";
import NavHeader from "./NavHeader";
const LobbyHome: React.FC<PageProps> = (prop) => {
  const { width, height } = useCoord();
  const { user } = useUserManager();
  const render = useMemo(() => {
    return (
      <>
        {user ? (
          <>
            <NavHeader />
            <div style={{ position: "relative", display: "flex", height: height }}>
              <SlideNavProvider pageProp={prop}>
                <MenuNav />
                <LobbyContent />
              </SlideNavProvider>
            </div>
            <OpponentSearch />
          </>
        ) : null}
      </>
    );
  }, [prop, user, height, width]);
  return <>{render}</>;
};

export default LobbyHome;
