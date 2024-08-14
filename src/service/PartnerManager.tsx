import { useConvex } from "convex/react";
import { PageItem } from "model/PageProps";
import { PartnerModel } from "model/PartnerModel";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { buildNavURL } from "util/PageUtils";
import { api } from "../convex/_generated/api";
import useEventSubscriber from "./EventManager";
import { usePageManager } from "./PageManager";
export type Authenticator = {
  partnerId: number;
  app: string;
  page: string;
  channel: number;
  name: string;
  path: string;
  role: number;
  redirectURL: string | null;
  params?: { [k: string]: string };
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
  const { createEvent } = useEventSubscriber(undefined, undefined);
  console.log("partner provider");
  const convex = useConvex();

  const getAuthenticator = useCallback((p: PartnerModel, page: PageItem): Authenticator | null => {
    const auth: { channels: number[]; role: number } | undefined = p.auth[page.app];
    if (auth) {
      const cid = page.params?.c ? Number(page.params["c"]) : auth.channels[0];
      if (cid) {
        const channel = p.channels.find((c) => c.id === cid);
        if (channel && p.authProviders) {
          const pro = p.authProviders.find((a) => a.name === channel.provider);

          if (pro) {
            const redirectURL = buildNavURL(page);
            return {
              partnerId: p.pid,
              app: page.app,
              page: page.name,
              channel: cid,
              name: pro.name,
              path: pro.path,
              role: auth.role,
              redirectURL,
              params: page.params,
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
      // const cpage = JSON.parse(JSON.stringify(currentPage));
      const params: { [k: string]: string } = currentPage.params ?? {};
      const partnerId = Number(currentPage.params?.partner ?? 0);
      if (!partner || (partnerId > 0 && partnerId !== partner["pid"])) {
        fetchPartner().then((p) => {
          if (p) {
            if (!app || params.app !== app.name) {
              setApp({ name: params.app, params });
            }
            setPartner(p);
            const au = getAuthenticator(p, currentPage);
            setAuthenticator(au);
          } else {
            console.log("partner not found");
            createEvent({ name: "PartnerNotFound", topic: "alert", data: "Partner Not Found", delay: 0 });
          }
        });
      } else if (!app || params.app !== app.name) {
        setApp({ name: params.app, params });
        const au = getAuthenticator(partner, currentPage);
        setAuthenticator(au);
      }
    }
  }, [currentPage, createEvent]);

  return <PartnerContext.Provider value={{ partner, app, authenticator }}> {children} </PartnerContext.Provider>;
};
export const usePartnerManager = () => {
  return useContext(PartnerContext);
};
export default PartnerProvider;
