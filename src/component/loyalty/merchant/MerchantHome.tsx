import React, { useCallback, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import PageProps from "../../../model/PageProps";

const MerchantHome: React.FC<PageProps> = (pageProp) => {
  const { user, logout } = useUserManager();
  const { partner } = usePartnerManager();
  const { openPage } = usePageManager();

  const openMemberCenter = useCallback(() => {
    const page = { name: "member", app: "merchant" };
    openPage(page);
  }, [openPage]);
  const signout = useCallback(() => {
    logout();
    const page = { name: "landing", app: "merchant" };
    openPage(page);
  }, []);
  const isEmbed = useMemo(() => {
    if (partner && partner.auth?.embed) return 1;
    else return 0;
  }, [partner]);

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
          onClick={() => openMemberCenter()}
        >
          Open Member Center
        </div>
        <div style={{ height: 100 }} />
        {user && isEmbed === 0 ? (
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
            onClick={signout}
          >
            Logout
          </div>
        ) : null}
      </div>
    </>
  );
};
export default MerchantHome;
