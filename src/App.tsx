import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect } from "react";
import PartnerProvider from "service/PartnerManager";
import "./App.css";
import { PageProvider, usePageManager } from "./service/PageManager";
import TournamentProvider from "./service/TournamentManager";
import { UserProvider } from "./service/UserManager";

import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import RenderModal from "./component/RenderModal";
import { ModalProvider } from "./service/ModalManager";
gsap.registerPlugin(CSSPlugin);
// 环境配置管理
const getConvexClient = (): ConvexReactClient => {
  // Vite 使用 import.meta.env，同时支持 REACT_APP_ 前缀以保持兼容性
  const convexUrl = import.meta.env.VITE_CONVEX_URL ||
    import.meta.env.REACT_APP_CONVEX_URL ||
    "https://cool-salamander-393.convex.cloud";
  return new ConvexReactClient(convexUrl);
};

const master_client = getConvexClient();

// 优化的 Provider 结构
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConvexProvider client={master_client}>
      <PartnerProvider>
        <UserProvider>

          <PageProvider>
            <ModalProvider>
              <TournamentProvider>
                {/* <PlatformProvider> */}
                {/* <GameCenterProvider> */}
                {children}
                {/* </GameCenterProvider> */}
                {/* </PlatformProvider> */}
              </TournamentProvider>
            </ModalProvider>
          </PageProvider>

        </UserProvider>
      </PartnerProvider>
    </ConvexProvider>
  );
};
// 性能监控 Hook
const usePerformanceMonitor = () => {
  useEffect(() => {
    // 安全地检查开发环境
    const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    if (isDevelopment) {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        console.log(`App initialization time: ${(endTime - startTime).toFixed(2)}ms`);
      };
    }
  }, []);
};

// 优化的主应用组件
const MainApp: React.FC = () => {
  const { loadingBG, onLoad } = usePageManager();
  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      loadingBG.ele = ele;
      onLoad();
    },
    [onLoad, loadingBG]
  );
  return (
    <>
      <div ref={load} style={{ width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "black", color: "white", fontSize: 20 }}>Loading...</div>
      <RenderApp />
      <RenderModal />
      <SSOController />
    </>
  );
};

// 主应用组件
const App: React.FC = () => {
  usePerformanceMonitor();

  return (
    <AppProviders>
      <MainApp />
      {/* <MatchLaunchControl /> */}
      {/* <UserEventHandler /> */}
    </AppProviders>
  );
};
export default App;
