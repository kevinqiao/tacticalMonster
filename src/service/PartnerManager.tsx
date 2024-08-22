import { useConvex } from "convex/react";
import { PartnerModel } from "model/PartnerModel";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { getURIParam } from "util/PageUtils";
import { api } from "../convex/_generated/api";

interface IPartnerContext {
  partner: PartnerModel | null;
}
const PartnerContext = createContext<IPartnerContext>({
  partner: null,
});

const PartnerProvider = ({ children }: { children: ReactNode }) => {
  // const { currentPage } = usePageManager();
  const [partner, setPartner] = useState<PartnerModel | null>(null);
  console.log("partner provider");
  const convex = useConvex();

  useEffect(() => {
    const fetchPartner = async (pid: number) => {
      const res = await convex.query(api.partner.find, {
        pid,
        host: window.location.hostname,
      });
      return res.ok ? res.message : null;
    };

    const partnerId = Number(getURIParam("partner") ?? 0);
    if (!partner || (partnerId > 0 && partnerId !== partner["pid"])) {
      console.log("fetch partner");
      fetchPartner(partnerId).then((p) => {
        if (p) {
          setPartner(p);
        } else {
          console.log("partner not found");
        }
      });
    }
  }, []);

  return <PartnerContext.Provider value={{ partner }}> {children} </PartnerContext.Provider>;
};
export const usePartnerManager = () => {
  return useContext(PartnerContext);
};
export default PartnerProvider;
