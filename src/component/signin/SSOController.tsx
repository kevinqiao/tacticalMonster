import { Loading } from "component/common/StyledComponents";
import { useAction } from "convex/react";
import { gsap } from "gsap";
import React, { FunctionComponent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/_generated/api";
import "./signin.css";
export interface AuthProvider {
  partnerId: number;
  app: string;
  page: string;
  channel: number;
  user: any;
  path: string;
  redirectURL: string | null;
  params?: { [k: string]: string };
}
export interface AuthProps {
  provider?: AuthProvider;
  close?: () => void;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [provider, setProvider] = useState<AuthProvider | null>(null);

  const { authenticator } = usePartnerManager();
  const { authComplete } = useUserManager();
  const { event } = useEventSubscriber(["signout"], ["account"], "SSOController");
  const authByToken = useAction(api.UserService.authByToken);
  useEffect(() => {
    console.log(event);
    if (event && authenticator) {
      console.log("change provider with signout");
      setProvider({ ...authenticator, user: null });
    }
  }, [event, authenticator]);

  useEffect(() => {
    const checkURL = async (uid: string, token: string, persist: number) => {
      if (!authenticator) return;
      const u = await authByToken({ uid, token });
      authComplete(u, persist);
      // setProvider({ ...authenticator, user: u });
      gsap.to(loadingRef.current, { autoAlpha: 0, duration: 0.7 });
    };

    const checkStorage = async (partnerId: number) => {
      if (!authenticator) return;
      const userJSON = localStorage.getItem("user");
      let u = null;
      if (userJSON !== null) {
        const userObj = JSON.parse(userJSON);
        if (userObj["uid"] && userObj["token"] && userObj["partner"] === partnerId) {
          u = await authByToken({ uid: userObj["uid"], token: userObj["token"] });
        }
      }
      authComplete(u, 1);
      setProvider({ ...authenticator, user: u });
      gsap.to(loadingRef.current, { autoAlpha: 0, duration: 0.7 });
    };

    if (authenticator) {
      const u = authenticator.params?.u;
      const t = authenticator.params?.t;
      const p = authenticator.params?.p;
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
          zIndex: 1100,
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          color: "white",
          backgroundColor: "blue",
          opacity: 0,
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
