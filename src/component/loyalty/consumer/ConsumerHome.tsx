import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import PageProps from "../../../model/PageProps";

const ConsumerHome: React.FC<PageProps> = (pageProp) => {
  const { partner } = usePartnerManager();
  const { user, logout } = useUserManager();
  const { openPage } = usePageManager();

  const openMemberCenter = useCallback(() => {
    const page = { name: "member", app: "consumer" };
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
        <div style={{ height: 100 }} />
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
          onClick={() => openGameCenter()}
        >
          open game center
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
