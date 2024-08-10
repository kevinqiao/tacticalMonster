import { Loading } from "component/common/StyledComponents";
import { useAction } from "convex/react";
import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/_generated/api";
import "./signin.css";
export interface AuthProps {
  provider:
    | {
        partnerId: number;
        app: string;
        page: string;
        channel: number;
        isOpen: number;
        path: string;
        params: { [k: string]: string };
      }
    | null
    | undefined;
  close?: () => void;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [provider, setProvider] = useState<
    | {
        partnerId: number;
        app: string;
        page: string;
        channel: number;
        isOpen: number;
        path: string;
        params: { [k: string]: string };
      }
    | null
    | undefined
  >(null);
  const { authenticator } = usePartnerManager();
  const { authComplete } = useUserManager();
  const authByToken = useAction(api.UserService.authByToken);
  const buildProvider = useCallback(
    (user: any) => {
      if (!authenticator) return;
      const role = user ? user.role ?? 1 : 0;
      const appCfg: any = AppsConfiguration.find((c) => c.name === authenticator?.app);
      if (appCfg?.navs) {
        const pageCfg: PageConfig | undefined = appCfg.navs.find((s: any) => s.name === authenticator?.page);
        if (pageCfg) {
          const cauth = pageCfg.auth ?? 0;
          setProvider({
            ...authenticator,
            isOpen: role >= cauth ? 0 : 1,
          });
        }
      }
    },
    [authenticator]
  );
  console.log(provider);
  useEffect(() => {
    const checkURL = async (uid: string, token: string, persist: number) => {
      if (!authenticator) return;
      const u = await authByToken({ uid, token });
      authComplete(u, persist);
      buildProvider(u);
      gsap.to(loadingRef.current, { autoAlpha: 0, duration: 0.7 });
    };

    const checkStorage = async (partnerId: number) => {
      if (!authenticator) return;
      const userJSON = localStorage.getItem("user");
      console.log("partnerId:" + partnerId);
      console.log(userJSON);
      let u = null;
      if (userJSON !== null) {
        const userObj = JSON.parse(userJSON);
        if (userObj["uid"] && userObj["token"] && userObj["partner"] === partnerId) {
          u = await authByToken({ uid: userObj["uid"], token: userObj["token"] });
        }
      }
      authComplete(u, 1);
      buildProvider(u);
      gsap.to(loadingRef.current, { autoAlpha: 0, duration: 0.7 });
    };

    if (authenticator) {
      const { u, t, p } = authenticator.params;
      if (u && t) checkURL(u, t, p ? +p : 0);
      else checkStorage(authenticator.partnerId);
    }
  }, [authenticator]);

  const render = useMemo(() => {
    if (provider) {
      const SelectedComponent: FunctionComponent<AuthProps> = lazy(() => import(`${provider.path}`));
      return (
        <Suspense
          fallback={
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                color: "white",
                backgroundColor: "blue",
              }}
            >
              Loading
            </div>
          }
        >
          <SelectedComponent provider={provider} />
        </Suspense>
      );
    }
  }, [provider]);
  return (
    <>
      {render}
      <div
        ref={loadingRef}
        style={{
          position: "absolute",
          zIndex: 2100,
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          color: "white",
          backgroundColor: "blue",
          visibility: "hidden",
        }}
      >
        <Loading>
          <span>Loading</span>
        </Loading>
      </div>
    </>
  );
};

export default SSOController;
