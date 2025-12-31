import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getURLParams } from "util/PageUtils";
import { PANELS } from "./config";
import "./signin.css";

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

const SSOController: React.FC = () => {
  const [panelConfig, setPanelConfig] = useState<{ pid: string, name: string, path: string } | null>(null);
  const SelectedComponent = useMemo(() => {
    if (!panelConfig) return null;
    return lazy(() => import(`./${panelConfig.path}`));
  }, [panelConfig]);
  useEffect(() => {
    const params: { [k: string]: string } = getURLParams(window.location);
    console.log("params", params);
    const pid = params.t || "1";
    const config = PANELS.find((p) => p.pid === pid);

    if (config) {
      setPanelConfig(config);
    }
  }, []);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2000, width: "100%", height: "100%", backgroundColor: "transparent", pointerEvents: "none", overflow: "hidden" }}>

      {SelectedComponent && <Suspense fallback={<div />}>
        <SelectedComponent />
      </Suspense>}
      {/* {platform?.pid === 0 && <div className="auth_check"><div style={{ color: "white", fontSize: "20px" }}>Not support</div></div>} */}
    </div>
  );
};

export default SSOController;
