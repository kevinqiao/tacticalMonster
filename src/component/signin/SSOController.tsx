import { PageItem } from "model/PageProps";
import React, { FunctionComponent, useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { getURIParam } from "util/PageUtils";
import "./signin.css";
export interface AuthenticatorHandle extends HTMLDivElement {
  someMethod(): void;
}

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
}
export interface AuthInit {
  open: number;
  // cancelPage: PageItem | null;
  cancel: () => void;
  afterSignedPage: PageItem;
}
export interface AuthProps {
  provider?: AuthProvider;
  authInit?: AuthInit;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const { user } = useUserManager();
  const { partner } = usePartnerManager();
  const { app, currentPage } = usePageManager();
  const [provider, setProvider] = useState<any>(null);
  console.log("sso controller");
  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);

  const [SelectedComponent, setSelectedComponent] = useState<FunctionComponent<AuthProps> | null>(null);

  useEffect(() => {
    if (provider) {
      const loadComponent = async () => {
        // const module = await import("./provider/CustomAuthenticator");
        const module = await import(`${provider.path}`);
        setSelectedComponent(() => module.default);
      };
      loadComponent();
    }
  }, [provider]);

  // useEffect(() => {
  //   if (!currentPage || !partner || !user) return;
  //   const role = user?.uid ? user.role ?? 1 : 0;
  //   const pageConfig = getPageConfig(currentPage.app, currentPage.name);
  //   if (pageConfig) {
  //     const childNavConfig = currentPage.child
  //       ? getNavConfig(currentPage.app, currentPage.name, currentPage.child)
  //       : null;
  //     const auth = Math.max(pageConfig.auth ?? 0, childNavConfig?.auth ?? 0);
  //     // const cancelPage = getPrePage();
  //     const open = role < auth ? 1 : 0;
  //     setAuthInit({ open, afterSignedPage: currentPage, cancel });
  //   }
  // }, [partner, currentPage, getPrePage, user]);
  useEffect(() => {
    if (!partner || !app) return;
    let channelId = 0;
    if (getURIParam("c")) channelId = Number(getURIParam("c"));
    const auth: { channels: number[]; role: number } | undefined = partner.auth[app.name];
    if (auth) {
      const cid = channelId > 0 ? channelId : auth.channels[0];
      const channel = partner.channels.find((c) => c.id === cid);
      if (channel && partner.authProviders) {
        const pro = partner.authProviders.find((a) => a.name === channel.provider);
        if (pro) {
          setProvider({
            ...pro,
            partnerId: partner.pid,
            app: app.name,
            channelId: cid,
          });
        }
      }
    }
  }, [partner, app]);

  if (!provider || !SelectedComponent) return null;
  console.log(provider);
  return (
    <>
      <SelectedComponent provider={provider} authInit={authInit} />
    </>
  );
};

export default SSOController;
