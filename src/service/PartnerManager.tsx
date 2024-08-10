import { useConvex } from "convex/react";
import { PartnerModel } from "model/PartnerModel";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { usePageManager } from "./PageManager";
export type Authenticator = {
  partnerId: number;
  app: string;
  page: string;
  channel: number;
  name: string;
  path: string;
  role: number;
  params: { [k: string]: string };
};

export type App = {
  name: string;
  params: { [k: string]: string };
};

interface IPartnerContext {
  app: { name: string; params: { [k: string]: string } } | null;
  partner: PartnerModel | null;
  authenticator: Authenticator | null;
}
const PartnerContext = createContext<IPartnerContext>({
  app: null,
  partner: null,
  authenticator: null,
});

const PartnerProvider = ({ children }: { children: ReactNode }) => {
  const [app, setApp] = useState<App | null>(null);
  const { currentPage } = usePageManager();
  const [partner, setPartner] = useState<PartnerModel | null>(null);
  const [authenticator, setAuthenticator] = useState<Authenticator | null>(null);

  const convex = useConvex();

  const getAuthenticator = useCallback((p: PartnerModel, a: App, page: string): Authenticator | null => {
    const auth: { channels: number[]; role: number } | undefined = p.auth[a.name];
    if (auth) {
      const cid = a.params["c"] ? Number(a.params["c"]) : auth.channels[0];
      if (cid) {
        const channel = p.channels.find((c) => c.id === cid);
        if (channel && p.authProviders) {
          const pro = p.authProviders.find((a) => a.name === channel.provider);
          if (pro) {
            return {
              partnerId: p.pid,
              app: a.name,
              page,
              channel: cid,
              name: pro.name,
              path: pro.path,
              role: auth.role,
              params: a.params,
            };
          }
        }
      }
    }
    return null;
  }, []);
  useEffect(() => {
    const fetchPartner = async () => {
      if (!currentPage) return;
      const pid = Number(currentPage.params?.partner ?? 0);
      const res = await convex.query(api.partner.find, {
        pid,
        app: currentPage?.app,
        host: window.location.hostname,
      });
      return res.ok ? res.message : null;
    };

    if (currentPage) {
      const params: { [k: string]: string } = currentPage.params ?? {};
      const partnerId = Number(currentPage.params?.partner ?? 0);
      if (!partner || (partnerId > 0 && partnerId !== partner["pid"])) {
        fetchPartner().then((p) => {
          if (p) {
            if (!app || params.app !== app.name) {
              setApp({ name: params.app, params });
            }
            setPartner(p);
            const au = getAuthenticator(p, { name: currentPage.app, params }, currentPage.name);
            setAuthenticator(au);
          }
        });
      } else if (!app || params.app !== app.name) {
        setApp({ name: params.app, params });
        const au = getAuthenticator(partner, { name: currentPage.app, params }, currentPage.name);
        setAuthenticator(au);
      }
    }
  }, [currentPage]);

  return <PartnerContext.Provider value={{ partner, app, authenticator }}> {children} </PartnerContext.Provider>;
};
export const usePartnerManager = () => {
  const ctx = useContext(PartnerContext);
  return ctx;
};
export default PartnerProvider;
