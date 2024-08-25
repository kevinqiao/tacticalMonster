import { useConvex } from "convex/react";
import PageProps from "model/PageProps";
import React, { useEffect } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";
import { api } from "../../../../convex/_generated/api";

const InboxHome: React.FC<PageProps> = (prop) => {
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();
  const convex = useConvex();
  useEffect(() => {
    const fetchInventory = async (pid: number) => {
      const res = await convex.query(api.loyalty.register.findInventory, { partnerId: pid, locale });
      console.log(res);
    };
    if (partner && locale) {
      fetchInventory(partner.pid);
    }
  }, [partner, locale]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        Inbox Home
      </div>
    </>
  );
};

export default InboxHome;
