import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageContainer, PageItem, usePageManager } from "service/PageManager";
import { CloseEffects } from "../animate/effect/CloseEffects";
import "./render.css";

// Register the plugin
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data?: { [key: string]: any };
  visible: number;
  close?: (page?: PageItem) => void;
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
  './kumu/battle/PlayMap': () => import('./kumu/battle/PlayMap'),
  './lobby/LobbyHome': () => import('./lobby/LobbyHome'),
  './lobby/LobbyControl': () => import('./kumu/lobby/LobbyControl'),
  './lobby/view/Child1': () => import('./lobby/view/Child1'),
  './lobby/view/Child2': () => import('./lobby/view/Child2'),
  './lobby/view/Child3': () => import('./lobby/view/Child3'),
  './lobby/view/Child4': () => import('./lobby/view/Child4'),
  './lobby/center/GameList': () => import('./lobby/center/GameList'),
  './lobby/tournament/Join': () => import('./lobby/tournament/Join'),
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
        return import(/* webpackChunkName: "component" */ normalizedPath).catch((error) => {
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

// 简化的动画管理 Hook
const useAnimationManager = (container: PageContainer) => {
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  const cleanupAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
  }, []);

  const setAnimationRef = useCallback((tl: gsap.core.Timeline | null) => {
    animationRef.current = tl;
  }, []);

  const clearAnimationRef = useCallback(() => {
    animationRef.current = null;
  }, []);

  return { cleanupAnimation, setAnimationRef, clearAnimationRef };
};

// 优化的可见性计算 Hook
const usePageVisibility = (container: PageContainer, changeEvent: any, pageContainers: PageContainer[], parent?: PageContainer) => {
  return useMemo(() => {
    // 获取当前页面的 URI
    const currentUri = changeEvent?.page?.uri || window.location.pathname;

    const containerUri = container.uri;
    const parentUri = parent?.uri;
    const containerParentUri = container.parentURI;

    // 检查当前URI是否匹配容器URI（完全匹配或子路径匹配）
    const isVisible = (currentUri === containerUri || currentUri.startsWith(containerUri + '/')) ||
      currentUri === parentUri ||
      (containerParentUri && currentUri === containerParentUri);

    console.log(`PageVisibility check:`, {
      currentUri,
      containerUri,
      parentUri,
      containerParentUri,
      isVisible,
      changeEvent: changeEvent?.page,
      windowPath: window.location.pathname
    });

    return isVisible ? 1 : 0;
  }, [changeEvent?.page?.uri, container.uri, container.parentURI, parent?.uri]);
};

// 优化的页面组件
const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { openPage, pageUpdated, changeEvent, pageContainers, onLoad } = usePageManager();
  const { cleanupAnimation, setAnimationRef, clearAnimationRef } = useAnimationManager(container);

  // 使用缓存的组件
  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);

  // 优化的可见性计算
  const visible = usePageVisibility(container, changeEvent, pageContainers, parent);

  // 调试信息
  // console.log(`PageComponent ${container.name}:`, {
  //   visible,
  //   containerUri: container.uri,
  //   currentUri: changeEvent?.page?.uri || window.location.pathname,
  //   hasElement: !!container.ele
  // });

  // 优化的关闭处理
  const close = useCallback((forwardPage?: PageItem) => {
    if (!container.close) return;
    console.log("container close", container);
    console.log("close", container, forwardPage);
    // console.log(`🎬 Closing page: ${container.name}`);

    const tl = gsap.timeline({
      onComplete: () => {
        console.log("onComplete", container);
        cleanupAnimation();
        if (forwardPage) {
          openPage(forwardPage);
        } else {
          console.log("history.back");
          history.back();
        }
      }
    });
    setAnimationRef(tl);
    const closeEffect = CloseEffects[container.close.effect]({
      container: container,
      tl: tl
    });
    console.log("closeEffect", closeEffect);

    if (closeEffect) {
      closeEffect.play();
    }
  }, [container, openPage, cleanupAnimation, setAnimationRef]);

  // 优化的加载处理
  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      container.ele = ele;
      if (ele) {
        // console.log(`🎬 Loading page: ${container.name}`);

        gsap.set(ele, { autoAlpha: 0 });

        // 执行进入动画
        const tl = gsap.timeline({
          onComplete: () => {
            // console.log(`🎬 Page loaded: ${container.name}`);
            // 动画完成后清理引用，但不杀死动画
            clearAnimationRef();
          }
        });

        tl.to(ele, { autoAlpha: 1, duration: 0.3, ease: "power2.out" });
        setAnimationRef(tl);
      }
      onLoad();
    },
    [onLoad, container, setAnimationRef, clearAnimationRef]
  );

  // 优化的全屏处理
  const openFull = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (container.ele) {
        const tl = gsap.timeline({
          onComplete: () => resolve()
        });

        tl.to(container.ele, {
          width: "100%",
          height: "100%",
          duration: 0.5,
          ease: "power2.out"
        });
      } else {
        resolve();
      }
    });
  }, [container]);
  // 数据更新处理
  useEffect(() => {
    if (changeEvent?.page?.uri === container.uri) {
      setData(changeEvent?.page?.data);
    }
  }, [changeEvent, container.uri]);

  useEffect(() => {
    if (pageUpdated?.uri === container.uri) {
      setData(pageUpdated.data);
    }
  }, [pageUpdated, container.uri]);

  // 清理动画
  useEffect(() => {
    return () => {
      cleanupAnimation();
    };
  }, [cleanupAnimation]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        ref={(ele) => container.mask = ele}
        style={{
          position: "fixed",
          zIndex: 2000,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          opacity: 0,
          visibility: "hidden"
        }}
        onClick={() => close()}
      />

      {/* 页面容器 */}
      <div
        key={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        id={`${container.app}-${parent ? parent.name + "-" : ""}${container.name}`}
        ref={load}
        className={container.class}
        style={{
          display: visible ? 'block' : 'none',
          opacity: visible ? 1 : 0.8,
          visibility: visible ? 'visible' : 'hidden'
        }}
        data-visible={visible}
        data-container-name={container.name}
      >
        <Suspense fallback={<div className="page-loading" />}>
          <SelectedComponent
            data={data}
            visible={visible}
            close={close}
            openFull={openFull}
          />
        </Suspense>

        {/* 关闭按钮 */}
        {container.close && container.close.type === 1 && (
          <div
            ref={(ele) => (container.closeEle = ele)}
            className="exit-menu"
            onClick={() => close()}
          />
        )}
      </div>

      {/* 递归渲染子页面 */}
      {container.children?.map((c: PageContainer) => (
        <PageComponent
          key={c.uri}
          parent={container}
          container={c}
        />
      ))}
    </>
  );
};

// 性能监控 Hook
const useRenderPerformance = () => {
  const renderCount = useRef<number>(0);

  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.log('useRenderPerformance: Starting performance monitoring');

      // 记录渲染开始时间
      const startTime = performance.now();

      console.log(`🚀 RenderApp render started at ${startTime.toFixed(2)}ms`);

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      console.log(`🚀 RenderApp render #${renderCount.current} completed in ${renderTime.toFixed(2)}ms`);
    } else {
      console.log('useRenderPerformance: Not in development mode, skipping monitoring');
    }
  }, []);
};

// 优化的主渲染组件
const RenderApp: React.FC = () => {
  const { pageContainers } = usePageManager();
  useRenderPerformance();

  // 优化的页面渲染
  const renderPage = useMemo(() => {
    if (!pageContainers?.length) return null;

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
