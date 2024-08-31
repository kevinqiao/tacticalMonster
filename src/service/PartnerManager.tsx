import { useConvex } from "convex/react";
import { PartnerModel } from "model/PartnerModel";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { getURIParam } from "util/PageUtils";
import { api } from "../convex/_generated/api";
import { usePageManager } from "./PageManager";
import { useUserManager } from "./UserManager";

interface IPartnerContext {
  partner: PartnerModel | null;
}
const PartnerContext = createContext<IPartnerContext>({
  partner: null,
});

const PartnerProvider = ({ children }: { children: ReactNode }) => {
  const [partner, setPartner] = useState<PartnerModel | null>(null);
  const [checkCompleted, setCheckCompleted] = useState(0);
  const { user } = useUserManager();
  const { openError } = usePageManager();
  console.log("partner provider");

  const convex = useConvex();
  const fetchPartner = useCallback(async (pid: number) => {
    const res = await convex.query(api.partner.find, {
      pid,
      host: window.location.hostname,
    });
    return res.ok ? res.message : null;
  }, []);
  useEffect(() => {
    if (checkCompleted > 0) {
      if (user?.partner) {
        fetchPartner(user.partner).then((p) => {
          setPartner(p);
        });
      } else openError({ name: "PartnerNotFound" });
    }
  }, [user, checkCompleted]);
  useEffect(() => {
    const partnerId = Number(getURIParam("partner") ?? 0);
    if (!partner || partnerId !== partner?.pid) {
      fetchPartner(partnerId).then((p) => {
        if (p) {
          setPartner(p);
        } else {
          setCheckCompleted(1);
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
