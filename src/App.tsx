import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import UserEventHandler from "service/handler/UserEventHandler";
import usePlatform, { PlatformProvider } from "service/PlatformManager";
import "./App.css";
import GameCenterProvider from "./service/GameCenterManager";
import { PageProvider, usePageManager } from "./service/PageManager";
import { UserProvider, useUserManager } from "./service/UserManager";

// 环境配置管理
const getConvexClient = (): ConvexReactClient => {
  // 在浏览器环境中安全地获取环境变量
  const convexUrl = (typeof process !== 'undefined' && process.env?.REACT_APP_CONVEX_URL)
    ? process.env.REACT_APP_CONVEX_URL
    : "https://cool-salamander-393.convex.cloud";
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
      <UserProvider>
        <PageProvider>
          <PlatformProvider>
            <GameCenterProvider>
              {children}
            </GameCenterProvider>
          </PlatformProvider>
        </PageProvider>
      </UserProvider>
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
  const { sso, isAppReady } = useAppState();
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
      <SSOController onLoad={() => sso.setLoaded(true)} />
    </>
  );
};

// 主应用组件
const App: React.FC = () => {
  usePerformanceMonitor();

  return (
    <AppProviders>
      <MainApp />
      <UserEventHandler />
    </AppProviders>
  );
};
export default App;
