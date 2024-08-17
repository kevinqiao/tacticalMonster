import React, { useCallback } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import PageProps from "../../../model/PageProps";

const ConsumerHome: React.FC<PageProps> = (pageProp) => {
  const { partner } = usePartnerManager();
  const { user, logout } = useUserManager();
  const { openPage } = usePageManager();
  const { createEvent } = useEventSubscriber([], []);
  const signin = useCallback(() => {
    const loginEvent = { name: "signin", topic: "account", delay: 0 };
    createEvent(loginEvent);
  }, [createEvent]);
  const openMemberCenter = useCallback(() => {
    const page = { name: "member", app: "consumer" };
    openPage(page);
  }, [openPage]);
  const openScan = useCallback(() => {
    const page = { name: "scanOrder", app: "consumer" };
    openPage(page);
  }, [openPage]);
  const openGameCenter = useCallback(() => {
    if (!user || !partner) return;
    const { uid, token } = user;
    let url =
      window.location.protocol + "//" + window.location.host + "/loyalty/gameplay" + "?u=" + uid + "&t=" + token;
    if (partner.pid > 0) url = url + "&partner=" + partner.pid;
    window.open(url, "_blank");
  }, [partner, user]);
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
          backgroundColor: "red",
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
          onClick={() => openMemberCenter()}
        >
          open my member
        </div>
        <div style={{ height: 50 }} />
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
          onClick={() => openScan()}
        >
          Scan
        </div>
        <div style={{ height: 50 }} />
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
          onClick={() => signin()}
        >
          Sign In
        </div>
        <div style={{ height: 100 }} />
        {user?.uid ? (
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
            onClick={logout}
          >
            Logout
          </div>
        ) : null}
      </div>
    </>
  );
};
export default ConsumerHome;
