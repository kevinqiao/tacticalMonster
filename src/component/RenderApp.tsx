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

// 获取缓存的组件
const getCachedComponent = (path: string): React.ComponentType<PageProp> => {
  if (!ComponentCache.has(path)) {
    ComponentCache.set(path, lazy(() => import(path)));
  }
  return ComponentCache.get(path)!;
};

// 动画状态管理 Hook
const useAnimationState = (container: PageContainer) => {
  const [animationState, setAnimationState] = useState<'idle' | 'entering' | 'exiting'>('idle');
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  const startAnimation = useCallback((type: 'enter' | 'exit') => {
    setAnimationState(type === 'enter' ? 'entering' : 'exiting');
  }, []);

  const endAnimation = useCallback(() => {
    setAnimationState('idle');
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
  }, []);

  const setAnimationRef = useCallback((tl: gsap.core.Timeline) => {
    animationRef.current = tl;
  }, []);

  return { animationState, startAnimation, endAnimation, setAnimationRef };
};

// 优化的可见性计算 Hook
const usePageVisibility = (container: PageContainer, changeEvent: any, pageContainers: PageContainer[], parent?: PageContainer) => {
  return useMemo(() => {
    if (!changeEvent?.page?.uri) return 0;

    const currentUri = changeEvent.page.uri;
    const containerUri = container.uri;
    const parentUri = parent?.uri;
    const containerParentUri = container.parentURI;

    // 简化的可见性判断逻辑
    return currentUri === containerUri ||
      currentUri === parentUri ||
      (containerParentUri && currentUri === containerParentUri) ||
      (containerParentUri && parentUri && currentUri === containerParentUri) ? 1 : 0;
  }, [changeEvent?.page?.uri, container.uri, container.parentURI, parent?.uri]);
};

// 优化的页面组件
const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { openPage, pageUpdated, changeEvent, pageContainers, onLoad } = usePageManager();
  const { animationState, startAnimation, endAnimation, setAnimationRef } = useAnimationState(container);

  // 使用缓存的组件
  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);

  // 优化的可见性计算
  const visible = usePageVisibility(container, changeEvent, pageContainers, parent);

  // 优化的关闭处理
  const close = useCallback((forwardPage?: PageItem) => {
    if (!container.close) return;

    startAnimation('exit');

    const tl = gsap.timeline({
      onComplete: () => {
        endAnimation();
        if (forwardPage) {
          openPage(forwardPage);
        } else if (container.onExit) {
          console.log("onExit", container);
          openPage(container.onExit);
        } else {
          history.back();
        }
      }
    });

    setAnimationRef(tl);

    const closeEffect = CloseEffects[container.close.effect]({
      container: container,
      tl: tl
    });

    if (closeEffect) {
      closeEffect.play();
    }
  }, [container, openPage, startAnimation, endAnimation, setAnimationRef]);

  // 优化的加载处理
  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      container.ele = ele;
      if (ele) {
        gsap.set(ele, { autoAlpha: 0 });
      }
      onLoad();
    },
    [onLoad, container]
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
      endAnimation();
    };
  }, [endAnimation]);

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
        className={`${container.class} ${animationState !== 'idle' ? `animating-${animationState}` : ''}`}
        data-animation-state={animationState}
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
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        console.log(`RenderApp render time: ${(endTime - startTime).toFixed(2)}ms`);
      };
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
