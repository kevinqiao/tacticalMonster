import { useConvex } from "convex/react";
import { api } from "convex/sso/convex/_generated/api";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getURLParams } from "util/PageUtils";



const GAME_LIST = [
  {
    id: "1",
    name: "Solitaire",
    ssa: "solitaire",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "2",
    name: "Game 2",
    ssa: "ssa2",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "3",
    name: "Game 3",
    ssa: "ssa3",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "4",
    name: "Game 4",
    ssa: "ssa4",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "5",
    name: "Game 5",
    ssa: "ssa5",
    api: "https://limitless-platypus-124.convex.site",
  },



]
export interface Partner {
  pid: number;
  name?: string;
  host?: string;
  auth_channels?: { cid: number; provider: string; }[];
}

interface IPartnerContext {
  partner: Partner | null;
}
const PartnerContext = createContext<IPartnerContext>({
  partner: null,
});



export const PartnerProvider = ({ children }: { children: React.ReactNode }) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const convex = useConvex();
  const value = {
    partner,
  }
  useEffect(() => {
    const fetchPartner = async () => {

      const params: { [k: string]: string } = getURLParams(window.location);
      const pid = params["pid"] ?? "0";
      console.log("fetchPartner:", pid);
      const partner = await convex.query(api.service.PartnerManager.find, { pid: +pid });
      console.log("partner:", partner);
      if (partner) {
        setPartner(partner);
      }
    }
    fetchPartner();
  }, []);

  return (
    <PartnerContext.Provider value={value}>
      {children}
    </PartnerContext.Provider>
  );
};
export const usePartnerManager = () => {
  const value = useContext(PartnerContext);
  if (!value) {
    throw new Error("usePartnerManager must be used within a PartnerProvider");
  }
  return value;
};
export default PartnerProvider;
