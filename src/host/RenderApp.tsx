import { isSameTree } from "@/host/util/PageUtils";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import "./render.css";
import { PageContainer, usePageManager } from "./service/PageManager";
import { usePageAnimate } from "./usePageAnimate";

export interface PageProp {
  data?: { [key: string]: any };
  visible: number;
  close?: () => Promise<void>;
  children?: React.ReactNode;
  openFull?: () => Promise<void>;
}

// 组件缓存
const ComponentCache = new Map<string, React.ComponentType<PageProp>>();

const isStaleChunkError = (error: unknown): boolean => {
  const msg = String((error as Error)?.message ?? error ?? "");
  return /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed/i.test(msg);
};

const RELOAD_META_KEY = "__viteDynamicImportReloadMetaV2";

const getChunkIdFromError = (error: unknown): string => {
  const msg = String((error as Error)?.message ?? error ?? "");
  const abs = msg.match(/https?:\/\/[^\s'")]+\.js/i)?.[0];
  if (abs) return abs;
  const rel = msg.match(/assets\/[^\s'")]+\.js/i)?.[0];
  if (rel) return rel;
  return msg.slice(0, 160);
};

const tryReloadForStaleChunk = (error: unknown): boolean => {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const now = Date.now();
    const chunkId = getChunkIdFromError(error);
    const raw = sessionStorage.getItem(RELOAD_META_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as { chunkId?: string; at?: number };
      if (prev.chunkId === chunkId && typeof prev.at === "number" && now - prev.at < 15000) {
        return false;
      }
    }
    sessionStorage.setItem(RELOAD_META_KEY, JSON.stringify({ chunkId, at: now }));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

// 错误边界组件
const ErrorComponent: React.FC<{ path: string; error?: Error }> = ({ path, error }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    color: '#666'
  }}>
    <h3>Component Load Error</h3>
    <p>Failed to load: {path}</p>
    {error && <p>Error: {error.message}</p>}
    <button onClick={() => window.location.reload()}>Reload Page</button>
  </div>
);

/** `host/config/PageConfiguration` 中路径相对于 `component/`；`RenderApp` 在 `host/` 下由 Vite 别名解析 */
function resolveComponentModule(normalizedPath: string): string {
  const rel = normalizedPath.startsWith("./") ? normalizedPath.slice(2) : normalizedPath;
  return `component/${rel}`;
}

// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/BattlePlay': () => import('component/battle/games/tacticalMonster/PlayTacticalMonster'),
  './lobby/tactical/LobbyHome': () => import('component/lobby/tactical/LobbyHome'),
  './lobby/tactical/view/Child1': () => import('component/lobby/tactical/view/Child1'),
  './lobby/tactical/view/Child2': () => import('component/lobby/tactical/view/Child2'),
  './lobby/tactical/view/Child3': () => import('component/lobby/tactical/view/Child3'),
  './lobby/tactical/view/Child4': () => import('component/lobby/tactical/view/Child4'),
  './lobby/casual/CasualHome': () => import('component/lobby/casual/CasualHome'),
  './lobby/casual/view/legacy/Child1': () => import('component/lobby/casual/view/legacy/Child1'),
  './lobby/casual/view/legacy/Child2': () => import('component/lobby/casual/view/legacy/Child2'),
  './lobby/casual/view/legacy/Child3': () => import('component/lobby/casual/view/legacy/Child3'),
  './lobby/casual/view/shop/CasualShopTab': () => import('component/lobby/casual/view/shop/CasualShopTab'),
  './lobby/casual/view/tasks/CasualTasksTab': () => import('component/lobby/casual/view/tasks/CasualTasksTab'),
  './lobby/casual/view/play/CasualPlayTab': () => import('component/lobby/casual/view/play/CasualPlayTab'),
  './lobby/casual/view/rewards/CasualRewardsTab': () => import('component/lobby/casual/view/rewards/CasualRewardsTab'),
  './lobby/casual/view/leaderboards/CasualLeaderboardsTab': () => import('component/lobby/casual/view/leaderboards/CasualLeaderboardsTab'),
};

// 获取缓存的组件
const getCachedComponent = (path: string): React.ComponentType<PageProp> => {
  if (!ComponentCache.has(path)) {
    const normalizedPath = path.startsWith('./') ? path : `./${path}`;

    // 检查是否有静态映射
    if (componentMap[normalizedPath]) {
      ComponentCache.set(path, lazy(() => {
        // console.log(`Loading component from static map: ${normalizedPath}`);
        return componentMap[normalizedPath]().catch((error) => {
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PageProp) => <ErrorComponent path={normalizedPath} error={error} />
          };
        });
      }));
    } else {
      // 如果没有静态映射，使用动态导入
      ComponentCache.set(path, lazy(() => {
        console.log(`Loading component dynamically: ${normalizedPath}`);
        return import(/* @vite-ignore */ resolveComponentModule(normalizedPath)).catch((error) => {
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PageProp) => <ErrorComponent path={normalizedPath} error={error} />
          };
        });
      }));
    }
  }
  return ComponentCache.get(path)!;
};


// 优化的页面组件
const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [visible, setVisible] = useState(0);
  const { pageEvent, pageContainers } = usePageManager();

  const { playInit } = usePageAnimate();
  // const { cleanupAnimation, setAnimationRef, clearAnimationRef } = useAnimationManager(container);

  // 使用缓存的组件
  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);

  const load = useCallback((ele: HTMLDivElement | null) => {
    container.ele = ele;
    if (container.ele) {
      playInit({
        container
      });
    }
  }, [container, playInit]);

  useEffect(() => {

    if (!pageEvent || !container) return;
    const { name, page, prepage } = pageEvent;
    // console.log("pageEvent", name, page, prepage);
    if (name === "pageOpen") {
      if (page?.uri?.startsWith(container.uri) || prepage?.uri?.startsWith(container.uri)) {
        setVisible(1);
      } else
        setVisible(0);
    } else if (name === "pageComplete") {
      if (!prepage?.uri) return;
      const sameTree = isSameTree(pageContainers, prepage.uri, page.uri);
      // 同树：只收起「刚离开的」那一层（与 container.uri 精确一致）；跨树：收起仍挂在 pre 路径下的祖先/叶子。
      const hide =
        (sameTree && prepage.uri === container.uri) ||
        (!sameTree && prepage.uri.startsWith(container.uri));
      if (hide) setVisible(0);
    }

  }, [pageEvent, container, pageContainers]);

  return (
    <>

      {/* 页面容器 */}
      <div
        key={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        id={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        ref={load}
        className={container.class}
        data-visible={visible}
        data-container-name={container.name}
      >
        {container.children?.map((c: PageContainer) => (
          <PageComponent
            key={c.uri}
            parent={container}
            container={c}
          />
        ))}
        <Suspense fallback={<div />}>
          <SelectedComponent visible={visible} />
        </Suspense>
      </div>


    </>
  );
};



// 优化的主渲染组件
const RenderApp: React.FC = () => {

  const { pageContainers } = usePageManager();
  // 优化的页面渲染
  const renderPage = useMemo(() => {
    return pageContainers.map((container) => (
      <PageComponent
        key={container.uri}
        container={container}
      />
    ));
  }, [pageContainers]);

  return <>{renderPage}</>;
};

export default RenderApp;
