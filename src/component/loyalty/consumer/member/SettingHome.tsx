import PageProps from "model/PageProps";
import React from "react";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";

const SettingHome: React.FC<PageProps> = (prop) => {
  const { width, height } = useCoord();
  const { user } = useUserManager();

  return (
    <>
      {/* <OrderCollect />
      <OrderRedeem /> */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        Setting Home
      </div>
    </>
  );
};

export default SettingHome;
