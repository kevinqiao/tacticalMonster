import { AppsConfiguration } from "model/PageConfiguration";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import "./signin.css";

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
  params?: { [k: string]: string };
}
export interface AuthProps {
  provider?: AuthProvider;
  redirectURL?: string;
  afterSignedURL: string | undefined | null;
  open?: number;
  onClose: () => void;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<number>(0);
  const { user } = useUserManager();
  const { partner } = usePartnerManager();
  const { app, currentPage } = usePageManager();

  console.log("sso provider:" + open);
  console.log(currentPage);
  const { event } = useEventSubscriber(["signin"], ["account"]);
  useEffect(() => {
    if (!currentPage || !user) return;
    const role = user.uid ? user.role ?? 1 : 0;
    const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
    if (appConfig) {
      const pageConfig = appConfig.navs.find((nav: any) => nav.name === currentPage.name);
      if (pageConfig && role < pageConfig.auth) {
        setOpen((pre) => (pre === 0 ? 1 : 0));
      }
    }
  }, [currentPage, user]);
  useEffect(() => {
    console.log(event);
    if (event) {
      setOpen((pre) => (pre === 0 ? 1 : 0));
    }
  }, [event]);

  const channelId = useMemo(() => {
    if (!currentPage) return 0;
    const channelId = currentPage.params?.c ? Number(currentPage.params.c) : 0;
    return channelId;
  }, [currentPage]);
  console.log(channelId);
  console.log(app);
  const provider = useMemo(() => {
    if (!partner || !app) return null;
    console.log(app);
    const auth: { channels: number[]; role: number } | undefined = partner.auth[app.name];
    if (auth) {
      console.log(auth);
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
            channelId,
            params: channel.data,
          };
        }
      }
    }
  }, [partner, app, channelId]);
  console.log(provider);
  // const provider = useMemo(() => {
  //   if (!partner || !currentPage || !user) return null;
  //   const channelId = currentPage.params?.c ? Number(currentPage.params.c) : 0;
  //   const auth: { channels: number[]; role: number } | undefined = partner.auth[currentPage.app];
  //   if (auth) {
  //     const cid = channelId > 0 ? channelId : auth.channels[0];
  //     const channel = partner.channels.find((c) => c.id === cid);
  //     if (channel && partner.authProviders) {
  //       const pro = partner.authProviders.find((a) => a.name === channel.provider);
  //       if (pro) {
  //         const role = user.uid ? user.role ?? 1 : 0;
  //         const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
  //         if (appConfig) {
  //           const pageConfig = appConfig.navs.find((nav: any) => nav.name === currentPage.name);
  //           if (pageConfig && (open > 0 || role < pageConfig.auth)) {
  //             const afterSignedUrl = buildNavURL(currentPage);
  //             console.log(afterSignedUrl);
  //             const redirectURL = window.location.pathname + window.location.search + window.location.hash;
  //             console.log(redirectURL);
  //             return {
  //               partnerId: partner.pid,
  //               app: currentPage.app,
  //               page: currentPage.name,
  //               name: pro.name,
  //               channelId: cid,
  //               redirectURL,
  //               afterSignedUrl,
  //               params: currentPage.params,
  //             };
  //           }
  //         }
  //       }
  //     }
  //   }
  // }, [partner, currentPage, user, open]);
  const redirectURL = useMemo(() => {
    const url = window.location.pathname + window.location.search + window.location.hash;
    return url;
  }, [currentPage]);
  const afterSignedURL = useMemo(() => {
    if (currentPage) return buildNavURL(currentPage);
    return undefined;
  }, [currentPage]);
  const onClose = useCallback(() => {
    setOpen(0);
  }, []);
  const SelectedComponent: FunctionComponent<AuthProps> | null = useMemo(() => {
    if (provider) {
      // 为了避免直接使用模板字符串，考虑传递实际的模块，而不是字符串路径。
      switch (provider.name) {
        case "clerk":
          return lazy(() => import("./provider/ClerkAuthenticator"));
        default:
          return null;
      }
    }
    return null;
  }, [provider]);

  if (!SelectedComponent || !provider) return null;
  // return (
  //   <>
  //     <CustomProvider provider={provider} />{" "}
  //   </>
  // );
  return (
    // <>{provider ? <ClerkAuthenticator provider={provider} /> : null} </>
    <Suspense fallback={<></>}>
      <SelectedComponent
        provider={provider}
        redirectURL={redirectURL}
        afterSignedURL={afterSignedURL}
        open={open}
        onClose={onClose}
      />
    </Suspense>
  );
};

export default SSOController;
