import PageProps from "model/PageProps";
import React, { useCallback, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";

const MemberHome: React.FC<PageProps> = (prop) => {
  const { width, height } = useCoord();
  const { user, logout } = useUserManager();
  const { openPage } = usePageManager();
  const openHome = useCallback(() => {
    const page = { name: "home", app: "merchant" };
    openPage(page);
  }, [openPage]);
  const signout = useCallback(() => {
    logout();
  }, []);
  const render = useMemo(() => {
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100vw",
            height: "100vh",
            color: "blue",
          }}
        >
          <div
            style={{
              cursor: "pointer",
              width: "200px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "blue",
              color: "white",
            }}
          >
            Member Management
          </div>
          <div style={{ height: 100 }}></div>
          <div
            style={{
              cursor: "pointer",
              width: "200px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "blue",
              color: "white",
            }}
            onClick={() => openHome()}
          >
            Home
          </div>
        </div>
      </>
    );
  }, [prop, user, height, width]);
  return <>{render}</>;
};

export default MemberHome;
