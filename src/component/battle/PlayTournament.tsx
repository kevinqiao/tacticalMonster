import { ModalProp } from "@/service/ModalManager";
import gsap from "gsap";
import React, { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import "./style.css";



// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './games/tacticalMonster/PlayTacticalMonster': () => import('./games/tacticalMonster/PlayTacticalMonster'),
};
const GAME_PROVIDERS: Record<string, string> = {
  'tacticalMonster': './games/tacticalMonster/PlayTacticalMonster',
};

export interface PlayTournamentProps {
  gameType: string;
  typeId: string;
  stageId: string;
}

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
const ComponentCache = new Map<string, React.ComponentType<PlayTournamentProps>>();
const getCachedComponent = (path: string): React.ComponentType<PlayTournamentProps> => {
  if (!ComponentCache.has(path)) {
    const normalizedPath = path.startsWith('./') ? path : `./${path}`;

    // 检查是否有静态映射
    if (componentMap[normalizedPath]) {
      ComponentCache.set(path, lazy(async () => {
        // console.log(`Loading component from static map: ${normalizedPath}`);
        try {
          return await componentMap[normalizedPath]();
        } catch (error) {
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PlayTournamentProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
          };
        }
      }));
    } else {
      // 如果没有静态映射，使用动态导入
      ComponentCache.set(path, lazy(async () => {
        console.log(`Loading component dynamically: ${normalizedPath}`);
        try {
          return await import(normalizedPath);
        } catch (error) {
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PlayTournamentProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
          };
        }
      }));
    }
  }
  return ComponentCache.get(path)!;
};


const PlayTournament: React.FC<ModalProp> = ({ visible, data }) => {

  const container = useRef<HTMLDivElement>(null);
  const SelectedComponent = useMemo(() => {
    if (!data) return null;
    const { gameType } = data;
    const path = GAME_PROVIDERS[gameType] ?? '';
    if (path === '') return null;
    return getCachedComponent(path);
  }, [data]);
  useEffect(() => {
    if (visible) {
      console.log("play tournament container", visible);
      gsap.to(container.current, {
        autoAlpha: 1,
        duration: 0.5,
        ease: "power2.inOut"
      });
    }
  }, [visible]);


  return (
    <div ref={container} className="play-tournament-container">
      {SelectedComponent && <Suspense fallback={<div />}>
        <SelectedComponent {...(data as PlayTournamentProps)} />
      </Suspense>}
    </div>
  );
};
export default PlayTournament;
