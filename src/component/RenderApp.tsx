import { isSameTree } from "@/util/PageUtils";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import "./render.css";
import { usePageAnimate } from "./shell/usePageAnimate";

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


// 优化的页面组件
const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [visible, setVisible] = useState(0);
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { pageEvent, onLoad, pageContainers } = usePageManager();

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
      onLoad();
    }
  }, [container, playInit, onLoad]);

  useEffect(() => {

    if (!pageEvent || !container) return;
    const { name, page, prepage } = pageEvent;
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
  // useEffect(() => {
  //   if (!pageEvent || !container) return;
  //   const { name, page, prepage } = pageEvent;
  //   if (name === "pageOpen") {
  //     if (!page?.uri) return;
  //     const p = normalizePageUri(page.uri);
  //     const c = normalizePageUri(container.uri);
  //     /**
  //      * 叶子子页必须用「全路径相等」，不能用 startsWith(container.uri)：
  //      * 否则从 c2 切到 c1 时 c2 仍为 visible=1（未命中 pageOpen），而 c1 也变为 1，
  //      * 同树后序的 child2 盖住 child1，滑动后仍显示 Child2。
  //      * 父级（含子路由的容器）用「自身 uri 或 uri/ 前缀」表示当前仍在其树下。
  //      */
  //     const hasChildRoutes = !!container.children?.length;
  //     if (hasChildRoutes) {
  //       if (p === c || p.startsWith(`${c}/`)) {
  //         setVisible(1);
  //       } else {
  //         setVisible(0);
  //       }
  //     } else if (p === c) {
  //       setVisible(1);
  //     } else {
  //       setVisible(0);
  //     }
  //   } else if (name === "pageComplete") {
  //     if (prepage?.uri) {
  //       const isHerit = isSameTree(pageContainers, page.uri, prepage.uri);
  //       const p = normalizePageUri(page.uri);
  //       const pre = normalizePageUri(prepage.uri);
  //       const c = normalizePageUri(container.uri);
  //       /** 必须用「等于」或「container/子路径」，避免裸 startsWith 误匹配 */
  //       const preUnderContainer = pre === c || pre.startsWith(`${c}/`);
  //       const pageUnderContainer = p === c || p.startsWith(`${c}/`);
  //       if (isHerit) {
  //         if (pre === c) {
  //           setVisible(0);
  //           /** slide 子页不再用 autoAlpha 收起，避免透明态竞态；仅靠 left 决定是否在视口内。 */
  //         }
  //       } else if (preUnderContainer && !pageUnderContainer) {
  //         setVisible(0);
  //         /** 离开树时仍由父容器显隐控制；slide 叶子不单独压暗。 */
  //       }
  //     }
  //   }

  // }, [pageEvent, container, pageContainers]);

  /** 统一子页优先渲染，避免父层覆盖子层交互。 */

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
          <SelectedComponent
            data={data}
            visible={visible}
          />
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
