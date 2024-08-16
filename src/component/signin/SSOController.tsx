import { AppsConfiguration } from "model/PageConfiguration";
import React, { FunctionComponent, lazy, Suspense, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import "./signin.css";
export type Authenticator = {
  partnerId: number;
  app: string;
  page: string;
  channelId: number;
  name: string;
  params?: { [k: string]: string };
};
export interface AuthProvider {
  partnerId: number;
  app: string;
  page: string;
  name: string;
  channelId: number;
  redirectURL: string | null;
  afterSignedUrl: string | undefined | null;
  params?: { [k: string]: string };
}
export interface AuthProps {
  provider?: AuthProvider;
  cancel?: () => void;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const { user } = useUserManager();
  const { partner } = usePartnerManager();
  const { currentPage } = usePageManager();
  // const selectors = useMemo(() => ["signout"], []);
  // const topics = useMemo(() => ["account"], []);
  // const [open, setOpen] = useState<number>(0);

  // const { event } = useEventSubscriber(selectors, topics, "SSOController");

  console.log("sso provider");
  console.log(currentPage);

  const provider = useMemo(() => {
    if (!partner || !currentPage || !user) return null;
    const channelId = currentPage.params?.c ? Number(currentPage.params.c) : 0;
    const auth: { channels: number[]; role: number } | undefined = partner.auth[currentPage.app];
    if (auth) {
      const cid = channelId > 0 ? channelId : auth.channels[0];
      const channel = partner.channels.find((c) => c.id === cid);
      if (channel && partner.authProviders) {
        const pro = partner.authProviders.find((a) => a.name === channel.provider);
        if (pro) {
          const role = user.uid ? user.role ?? 1 : 0;
          const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
          if (appConfig) {
            const pageConfig = appConfig.navs.find((nav: any) => nav.name === currentPage.name);
            if (pageConfig && role < pageConfig.auth) {
              const afterSignedUrl = buildNavURL(currentPage);
              console.log(afterSignedUrl);
              const redirectURL = window.location.pathname + window.location.search + window.location.hash;
              console.log(redirectURL);
              return {
                partnerId: partner.pid,
                app: currentPage.app,
                page: currentPage.name,
                name: pro.name,
                channelId: cid,
                redirectURL,
                afterSignedUrl,
                params: currentPage.params,
              };
            }
          }
        }
      }
    }
  }, [partner, currentPage, user]);

  const SelectedComponent: FunctionComponent<AuthProps> | null = useMemo(() => {
    if (provider) {
      // 为了避免直接使用模板字符串，考虑传递实际的模块，而不是字符串路径。
      switch (provider.name) {
        case "clerk":
          return lazy(() => import("./provider/CustomProvider"));
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
      <SelectedComponent provider={provider} />
    </Suspense>
  );
};

export default SSOController;
