import { ModalProp } from "@/service/ModalManager";
import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "./style.css";



// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './games/tacticalMonster/TacticalMonsterOver': () => import('./games/tacticalMonster/TacticalMonsterOver'),
};
const GAME_PROVIDERS: Record<string, string> = {
  'tacticalMonster': './games/tacticalMonster/TacticalMonsterOver',
};

export interface GameOverProps {
  gameId: string;
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
const ComponentCache = new Map<string, React.ComponentType<GameOverProps>>();
const getCachedComponent = (path: string): React.ComponentType<GameOverProps> => {
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
            default: (props: GameOverProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
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
            default: (props: GameOverProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
          };
        }
      }));
    }
  }
  return ComponentCache.get(path)!;
};


const GameOver: React.FC<ModalProp> = ({ name, container, visible, data, close }) => {
  const [gameType, setGameType] = useState<string>("tacticalMonster");
  const SelectedComponent = useMemo(() => {
    if (!gameType) return null;
    const path = GAME_PROVIDERS[gameType] ?? '';
    if (path === '') return null;
    return getCachedComponent(path);
  }, [gameType]);

  useEffect(() => {
    console.log("play game over data", data);
    if (data && data.gameType) {
      setGameType(data.gameType);
    }
  }, [data]);


  return (
    <div ref={(ele) => container.ele = ele} className="game-over-container">
      <div className="game-over-mask"></div>
      {SelectedComponent && <Suspense fallback={<div />}>
        <SelectedComponent {...(data as GameOverProps)} />
      </Suspense>}
      <div ref={(ele) => container.closeEle = ele ?? undefined} className="play-tournament-close" onClick={close}>
        X
      </div>
    </div>
  );
};
export default GameOver;
