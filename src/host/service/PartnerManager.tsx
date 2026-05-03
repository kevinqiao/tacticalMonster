import { getURLParams } from "@/host/util/PageUtils";
import { useConvex } from "convex/react";
import { api } from "convex/sso/convex/_generated/api";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Partner {
    pid: number;
    name?: string;
    host?: string;
    auth_channels?: { cid: number; provider: string }[];
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
    };
    useEffect(() => {
        const fetchPartner = async () => {
            const params: { [k: string]: string } = getURLParams(window.location);
            const pid = params["pid"] ?? "0";
            const partner = await convex.query(api.service.PartnerManager.find, { pid: +pid });

            if (partner) {
                setPartner(partner);
            }
        };
        fetchPartner();
    }, []);

    return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
};
export const usePartnerManager = () => {
    const value = useContext(PartnerContext);
    if (!value) {
        throw new Error("usePartnerManager must be used within a PartnerProvider");
    }
    return value;
};
export default PartnerProvider;
