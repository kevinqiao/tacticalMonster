import { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useMemo, useState } from "react";

import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { findContainer } from "util/PageUtils";
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
  authInit?: AuthInit;
}
// gsap.registerPlugin(MotionPathPlugin);
// const sso_client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const SSOController: React.FC = () => {
  const { user } = useUserManager();
  const { pageContainers, changeEvent, authReq, cancelAuth } = usePageManager();
  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);

  const SelectedComponent: FunctionComponent<AuthProps> = useMemo(() => {
    return lazy(() => import(`./provider/CustomAuthenticator`));
  }, []);

  const isOpen = useMemo(() => {
    if (authReq) return true;
    const page = changeEvent?.page;
    if (page) {
      const container = findContainer(pageContainers, page.uri);
      return container?.auth === 1 && (!user || !user.uid) ? true : false;
    }
    return false;
  }, [authReq, changeEvent, user, pageContainers]);


  return (
    // <ConvexProvider client={sso_client}>
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "transparent", pointerEvents: "none" }}>
      {isOpen ? <>
        <Suspense fallback={<div />}>
          <SelectedComponent authInit={authInit} />
        </Suspense>
        {changeEvent?.prepage && authReq && <div className="exit-menu" onClick={cancelAuth}></div>}
      </> : null}
    </div>

    // </ConvexProvider>
  );
};

export default SSOController;
