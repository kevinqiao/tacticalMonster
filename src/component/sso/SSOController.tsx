import React, { lazy, Suspense, useMemo } from "react";

import { usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
import "./signin.css";
const PROVIDERS: Record<
  string,
  string
> = {
  "TELEGRAM": "TelegramAuthenticator",
  "discord": "DiscordAuthenticator",
  "twitter": "TwitterAuthenticator",
  "google": "GoogleAuthenticator",
  "facebook": "FacebookAuthenticator",
  "WEB": "WebAuthenticator",
}
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
}
export interface AuthProps {
  onLoad: () => void;
}
// gsap.registerPlugin(MotionPathPlugin);
// const sso_client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");

const SSOController: React.FC<{ onLoad: () => void }> = ({ onLoad }) => {
  const { user } = useUserManager();
  const { platform } = usePlatform();
  // const { currentPage, authReq, cancelAuth } = usePageManager();
  // const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);

  const SelectedComponent = useMemo(() => {
    // return lazy(() => import(`./provider/${PROVIDERS[platform?.name ?? "WEB"]}`));
    return lazy(() => import(`./provider/CustomAuthenticator`));
  }, [platform]);


  return (
    <>
      {platform?.support && (user ? <Suspense fallback={<div />}>
        <SelectedComponent onLoad={onLoad} />
      </Suspense> : <div className="auth_check"><div style={{ color: "black", fontSize: "20px" }}></div></div>)}
      {platform && !platform.support && <div className="auth_check"><div style={{ color: "white", fontSize: "20px" }}>Not support</div></div>}
    </>
  );
};

export default SSOController;
