import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useEffect } from "react";
import PartnerProvider from "service/PartnerManager";
import "./App.css";
import { PageProvider } from "./service/PageManager";
import TournamentProvider from "./service/TournamentManager";
import { UserProvider } from "./service/UserManager";

import RenderApp from "./component/RenderApp";
import RenderModal from "./component/RenderModal";
import BootLoadingOverlay from "./component/shell/BootLoadingOverlay";
import { ModalProvider } from "./service/ModalManager";
// GSAP 在 RenderApp 等模块注册 CSSPlugin
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

  return (
    <>
      <BootLoadingOverlay />
      <RenderApp />
      <RenderModal />
      {/* <SSOController /> */}
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
