import { AppsConfiguration } from "model/PageConfiguration";
import React, { lazy, Suspense, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
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
  params?: { [k: string]: string };
}
export interface AuthInit {
  open: number;
  redirectURL: string;
  afterSignedURL: string;
  params?: { [k: string]: string };
}
export interface AuthProps {
  provider?: AuthProvider;
  authInit: AuthInit | null;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const { user } = useUserManager();
  const { partner } = usePartnerManager();
  const { app, currentPage } = usePageManager();
  console.log("sso controller");

  const authInit = useMemo(() => {
    if (!currentPage || !user || !partner) return null;
    const role = user.uid ? user.role ?? 1 : 0;
    const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
    if (appConfig) {
      const pageConfig = appConfig.navs.find((nav: any) => nav.name === currentPage.name);
      if (pageConfig) {
        const open = role < pageConfig.auth ? 1 : 0;
        const params: { [k: string]: string } = currentPage?.params
          ? { ...currentPage.params, partner: partner.pid + "" }
          : { partner: partner.pid + "" };
        const url = buildNavURL({ ...currentPage, params: { ...params, redirect: "1" } }) ?? "";

        return { open, redirectURL: url, afterSignedURL: url, params };
      }
      return null;
    }
    return null;
  }, [partner, currentPage, user]);

  const channelId = useMemo(() => {
    if (!currentPage) return 0;
    const channelId = currentPage.params?.c ? Number(currentPage.params.c) : 0;
    return channelId;
  }, [currentPage]);

  const provider = useMemo(() => {
    if (!partner || !app) return null;

    const auth: { channels: number[]; role: number } | undefined = partner.auth[app.name];
    if (auth) {
      const cid = channelId > 0 ? channelId : auth.channels[0];
      const channel = partner.channels.find((c) => c.id === cid);
      if (channel && partner.authProviders) {
        console.log(channel);
        const pro = partner.authProviders.find((a) => a.name === channel.provider);
        if (pro) {
          return {
            ...pro,
            partnerId: partner.pid,
            app: app.name,
            channelId: cid,
            params: channel.data,
          };
        }
      }
    }
  }, [partner, app, channelId]);

  const SelectedComponent: React.FC<AuthProps> | null = useMemo(() => {
    return provider ? lazy(() => import(`${provider.path}`)) : null;
    // return provider ? lazy(() => import("./provider/CustomProvider")) : null;
  }, [provider]);

  if (!SelectedComponent || !provider) return null;

  return (
    <Suspense fallback={<></>}>
      <SelectedComponent provider={provider} authInit={authInit} />
    </Suspense>
  );
};

export default SSOController;
