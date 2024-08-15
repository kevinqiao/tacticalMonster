import { useConvex } from "convex/react";
import { gsap } from "gsap";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const SSOController: React.FC = React.memo(() => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [provider, setProvider] = useState<AuthProvider | null>(null);

  const { authenticator } = usePartnerManager();
  const { authComplete } = useUserManager();
  const selectors = useMemo(() => ["signout"], []);
  const topics = useMemo(() => ["account"], []);
  const { event } = useEventSubscriber(selectors, topics, "SSOController");
  const convex = useConvex();
  // const authByToken = useAction(api.UserService.authByToken);
  console.log("sso provider");
  const authByToken = useCallback(
    async ({ uid, token }: { uid: string; token: string }) => {
      return await convex.action(api.UserService.authByToken, { uid, token });
    },
    [convex]
  );

  // useEffect(() => {
  //   console.log(event);
  //   if (event && authenticator) {
  //     console.log("change provider with signout");
  //     setProvider({ ...authenticator, user: null });
  //   }
  // }, [event, authenticator]);

   

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
  return <>{render}</>;
});
SSOController.displayName = "SSOController";
export default SSOController;
