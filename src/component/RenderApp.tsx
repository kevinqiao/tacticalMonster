import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import "./render.css";
import { usePageAnimate } from "./shell/usePageAnimate";

// Register the plugin
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data?: { [key: string]: any };
  visible: number;
  close?: () => Promise<void>;
  children?: React.ReactNode;
  openFull?: () => Promise<void>;
}

// 组件缓存
const ComponentCache = new Map<string, React.ComponentType<PageProp>>();

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

// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/BattlePlay': () => import('./battle/games/tacticalMonster/PlayTacticalMonster'),
  './kumu/battle/PlayMap': () => import('./kumu/battle/PlayMap'),
  './lobby/LobbyHome': () => import('./lobby/LobbyHome'),
  './lobby/LobbyControl': () => import('./kumu/lobby/LobbyControl'),
  './lobby/view/Child1': () => import('./lobby/view/Child1'),
  './lobby/view/Child2': () => import('./lobby/view/Child2'),
  './lobby/view/Child3': () => import('./lobby/view/Child3'),
  './lobby/view/Child4': () => import('./lobby/view/Child4'),
  './lobby/center/GameList': () => import('./lobby/center/GameList'),
  './lobby/tournament/PlayMatch': () => import('./lobby/tournament/PlayMatch'),
  './lobby/control/NavControl': () => import('./lobby/control/NavControl'),
  './www/W3Home': () => import('./www/W3Home'),
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
        return import(normalizedPath).catch((error) => {
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


// 优化的可见性计算 Hook
const usePageVisibility = (container: PageContainer, changeEvent: any, pageContainers: PageContainer[], parent?: PageContainer) => {
  return useMemo(() => {
    // 获取当前页面的 URI
    if (!changeEvent) return 0;
    const currentUri = changeEvent?.page?.uri;

    const containerUri = container.uri;
    const parentUri = parent?.uri;
    const containerParentUri = container.parentURI;

    // 检查当前URI是否匹配容器URI（完全匹配或子路径匹配）
    const isVisible = (currentUri === containerUri || currentUri.startsWith(containerUri + '/')) ||
      currentUri === parentUri ||
      (containerParentUri && currentUri === containerParentUri);
    return isVisible ? 1 : 0;
  }, [changeEvent?.page?.uri, container.uri, container.parentURI, parent?.uri]);
};

// 优化的页面组件
const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { pageEvent, onLoad } = usePageManager();
  const { playInit } = usePageAnimate();
  // const { cleanupAnimation, setAnimationRef, clearAnimationRef } = useAnimationManager(container);

  // 使用缓存的组件
  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);

  // 优化的可见性计算
  const visible = useMemo(() => {
    if (!pageEvent) return 0;
    if (pageEvent?.name === "pageOpen") {
      const page = pageEvent?.page;
      if (container.uri.startsWith(page?.uri) || page?.uri.startsWith(container.uri)) {
        return 1;
      }
      const prePage = pageEvent?.prepage;
      if (prePage?.uri === container.uri) {
        return 1;
      }
    } else if (pageEvent?.name === "pageComplete") {
      const prePage = pageEvent?.prepage;
      if (prePage?.uri === container.uri) {
        return 0;
      }
    }
    return 0;
  }, [container, pageEvent]);

  const load = useCallback((ele: HTMLDivElement | null) => {
    container.ele = ele;
    if (container.ele) {
      console.log("load", container);
      playInit({
        container
      });
      onLoad();
    }
  }, [container, playInit, onLoad]);
  // 数据更新处理
  useEffect(() => {
    if (pageEvent?.name === "pageUpdate" && pageEvent?.page?.uri === container.uri) {
      setData(pageEvent?.page?.data);
    }
  }, [pageEvent, container.uri]);

  // useEffect(() => {
  //   if (pageUpdated?.uri === container.uri) {
  //     setData(pageUpdated.data);
  //   }
  // }, [pageUpdated, container.uri]);

  return (
    <>

      {/* 页面容器 */}
      <div
        key={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        id={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        ref={(ele) => load(ele)}
        className={container.class}
        data-visible={visible}
        data-container-name={container.name}
      >
        <Suspense fallback={<div />}>
          <SelectedComponent
            data={data}
            visible={visible}
          />
        </Suspense>
        {/* 递归渲染子页面 */}
        {container.children?.map((c: PageContainer) => (
          <PageComponent
            key={c.uri}
            parent={container}
            container={c}
          />
        ))}
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
