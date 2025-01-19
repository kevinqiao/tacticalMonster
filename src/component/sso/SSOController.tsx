import { PageItem } from "model/PageProps";
import React, { FunctionComponent, useEffect, useState } from "react";
import { useUserManager } from "service/UserManager";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { parseLocation } from "util/PageUtils";
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
const sso_client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const SSOController: React.FC = () => {
  const { user, authComplete } = useUserManager();

  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);

  const [SelectedComponent, setSelectedComponent] = useState<FunctionComponent<AuthProps> | null>(null);
  console.log("user", user);
  useEffect(() => {

    const loadComponent = async () => {
      const module = await import("./provider/CustomAuthenticator");
      // const module = await import(`${provider.path}`);
      setSelectedComponent(() => module.default);
    };
    loadComponent();

  }, []);
  useEffect(() => {
    const params = parseLocation();
    if (params && params.data && params.data.uid) {
      authComplete({ uid: params.data.uid, token: "" }, 0);
    }
  }, [])

  if (!SelectedComponent) return null;

  return (
    <ConvexProvider client={sso_client}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "transparent", pointerEvents: "none" }}>
        {(!user || !user.uid) ? <SelectedComponent authInit={authInit} /> : null}
      </div>
    </ConvexProvider>
  );
};

export default SSOController;
