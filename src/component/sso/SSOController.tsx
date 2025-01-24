import { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useMemo, useState } from "react";

import { usePageManager } from "service/PageManager";
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
  const { authReq, cancelAuth } = usePageManager();
  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);
  // const [SelectedComponent, setSelectedComponent] = useState<FunctionComponent<AuthProps> | null>(null);

  // useEffect(() => {
  //   const loadComponent = async () => {
  //     const module = await import("./provider/CustomAuthenticator");
  //     // const module = await import(`${provider.path}`);
  //     setSelectedComponent(() => module.default);
  //   };
  //   loadComponent();

  // }, []);
  const SelectedComponent: FunctionComponent<AuthProps> = useMemo(() => {
    return lazy(() => import(`./provider/CustomAuthenticator`));
  }, []);

  console.log(authReq);
  return (
    // <ConvexProvider client={sso_client}>
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "transparent", pointerEvents: "none" }}>
      {authReq ? <>
        <Suspense fallback={<div />}>
          <SelectedComponent authInit={authInit} />
        </Suspense><div className="exit-menu" onClick={cancelAuth}></div> </> : null}
    </div>

    // </ConvexProvider>
  );
};

export default SSOController;
