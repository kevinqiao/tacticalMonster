import React, { lazy, Suspense, useMemo } from "react";

import { PLATFORMS, usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
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
    if (platform?.pid && platform.pid > 0) {
      const platformInfo = PLATFORMS[platform.type || 0];
      console.log(platformInfo)
      return lazy(() => import(`./provider/${platformInfo.auth}`));
    }
    return null;
  }, [platform]);

  return (
    <>
      {user && SelectedComponent && <Suspense fallback={<div />}>
        <SelectedComponent onLoad={onLoad} />
      </Suspense>}
      {/* {platform?.pid === 0 && <div className="auth_check"><div style={{ color: "white", fontSize: "20px" }}>Not support</div></div>} */}
    </>
  );
};

export default SSOController;
