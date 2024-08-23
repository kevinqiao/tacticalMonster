import { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { getPageConfig, getURIParam } from "util/PageUtils";
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
  cancelPage: PageItem | null;
  // redirectURL: string;
  // afterSignedURL: string;
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
  const { app, currentPage, getPrePage } = usePageManager();
  const [provider, setProvider] = useState<any>(null);
  console.log("sso controller");
  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);

  useEffect(() => {
    if (!currentPage || !user || !partner) return;
    const role = user.uid ? user.role ?? 1 : 0;

    const pageConfig = getPageConfig(currentPage.app, currentPage.name);
    if (pageConfig) {
      const cancelPage = getPrePage();
      const open = role < (pageConfig.auth ?? 0) ? 1 : 0;
      console.log("open:" + open);
      // const params: { [k: string]: string } = currentPage?.params
      //   ? { ...currentPage.params, partner: partner.pid + "" }
      //   : { partner: partner.pid + "" };
      // const url = buildNavURL({ ...currentPage, params: { ...params, redirect: "1" } }) ?? "";
      setAuthInit({ open, afterSignedPage: currentPage, cancelPage });
    }
  }, [partner, currentPage, getPrePage, user]);
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
          console.log(pro);
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

  if (!provider) return null;
  const SelectedComponent: FunctionComponent<AuthProps> = React.memo(lazy(() => import(`${provider.path}`)));

  return (
    <>
      <Suspense fallback={<></>}>
        <SelectedComponent provider={provider} authInit={authInit} />
      </Suspense>
    </>
  );
};

export default SSOController;
