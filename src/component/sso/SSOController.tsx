import { useUserManager } from "@/service/UserManager";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePageManager } from "service/PageManager";
import { findContainer, getURLParams } from "util/PageUtils";
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

/** 与 `config.ts` 里 `path` 一致；勿用 `import(\`./${path}\`)`，Vite 无法打包 */
const PANEL_LOADERS: Record<
  string,
  () => Promise<{ default: React.ComponentType<{ visible: number; onClose: () => void }> }>
> = {
  "panels/WebPanel1": () => import("./panels/WebPanel1"),
  "panels/WebPanel2": () => import("./panels/WebPanel2"),
};

const SSOController: React.FC = () => {
  const [visible, setVisible] = useState(0);
  const [panelConfig, setPanelConfig] = useState<{ pid: string, name: string, path: string } | null>(null);
  const { pageContainers, currentPage } = usePageManager();
  const { user, cancelAuth, authReq } = useUserManager()
  const SelectedComponent = useMemo(() => {
    if (!panelConfig) return null;
    const load = PANEL_LOADERS[panelConfig.path];
    if (!load) {
      console.warn(`[SSOController] No panel loader for path "${panelConfig.path}"`);
      return null;
    }
    return lazy(load);
  }, [panelConfig]);
  const onClose = useCallback(() => {
    console.log("onClose...");
    setVisible(0);
    cancelAuth();
  }, [cancelAuth]);
  useEffect(() => {
    const params: { [k: string]: string } = getURLParams(window.location);
    const pid = params.t || "1";
    const config = PANELS.find((p) => p.pid === pid);
    if (config) {
      setPanelConfig(config);
    }
  }, []);
  useEffect(() => {
    if (!pageContainers || !user) return;
    const container = currentPage ? findContainer(pageContainers, currentPage.uri) : null;
    if (!container) return;
    if (container && authReq) {
      //非强制认证 弹窗可关闭
      setVisible(1);
      return;
    }
    if (container.auth === 1 && !user.uid) {
      //强制认证 弹窗不可关闭
      setVisible(2);
      return;
    }
    setVisible(0);

  }, [pageContainers, currentPage, user, authReq]);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2000, width: "100%", height: "100%", backgroundColor: "transparent", pointerEvents: "none", overflow: "hidden" }}>

      {SelectedComponent && (
        <Suspense fallback={<div />}>
          <SelectedComponent key={panelConfig?.path} visible={visible} onClose={onClose} />
        </Suspense>
      )}
      {/* {platform?.pid === 0 && <div className="auth_check"><div style={{ color: "white", fontSize: "20px" }}>Not support</div></div>} */}
    </div >
  );
};

export default SSOController;
