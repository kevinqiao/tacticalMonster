import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import PartnerProvider from "service/PartnerManager";
import usePlatform from "service/PlatformManager";
import "./App.css";
import { PageProvider, usePageManager } from "./service/PageManager";
import { UserProvider, useUserManager } from "./service/UserManager";

// 环境配置管理
const getConvexClient = (): ConvexReactClient => {
  // Vite 使用 import.meta.env，同时支持 REACT_APP_ 前缀以保持兼容性
  const convexUrl = import.meta.env.VITE_CONVEX_URL ||
    import.meta.env.REACT_APP_CONVEX_URL ||
    "https://cool-salamander-393.convex.cloud";
  return new ConvexReactClient(convexUrl);
};

const master_client = getConvexClient();

// 统一状态管理 Hook
const useAppState = () => {
  const [ssoLoaded, setSsoLoaded] = useState(false);
  const [theme, setTheme] = useState({
    primaryColor: "#4CAF50",
    secondaryColor: "#45A049",
    backgroundColor: "#F0F0F0",
  });
  const [loading, setLoading] = useState(true);

  const { platform } = usePlatform();

  const isAppReady = useMemo(() => {
    return platform && ssoLoaded;
  }, [platform, ssoLoaded]);

  useEffect(() => {
    // 模拟应用初始化
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return {
    sso: { loaded: ssoLoaded, setLoaded: setSsoLoaded },
    platform: { ready: !!platform },
    ui: { theme, setTheme, loading },
    isAppReady
  };
};

// 优化的 Provider 结构
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConvexProvider client={master_client}>
      <PartnerProvider>
        <UserProvider>
          <PageProvider>
            {/* <PlatformProvider> */}
            {/* <GameCenterProvider> */}
            {children}
            {/* </GameCenterProvider> */}
            {/* </PlatformProvider> */}
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

  const { user } = useUserManager();
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
