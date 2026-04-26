import { ModalProp } from "@/service/ModalManager";
import React, { lazy, Suspense, useMemo } from "react";
import PlayTacticalMonster from "./games/tacticalMonster/PlayTacticalMonster";
import "./style.css";

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



// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  "./games/tacticalMonster/PlayTacticalMonster": () =>
    Promise.resolve({ default: PlayTacticalMonster }),
};
const GAME_PROVIDERS: Record<string, string> = {
  'tacticalMonster': './games/tacticalMonster/PlayTacticalMonster',
};
export interface GameData {
  game?: any;
  mode: string;//"tutorial" | "solo_challenge" | "multiplayer_tournament";
  phaseChanges?: any;
  typeId?: string;
  stageId?: string;
}
export interface PlayProps {
  gameType: "tacticalMonster" | string;//"tacticalMonster"
  playMode: string;//"join" | "watch" | "replay" | "play";
  gameData: GameData;
  close: () => void;
  //gameId?: string;
  // // gameType: string;
  // matchType?: 'solo' | 'multi_player';
  // mode: 'join' | 'watch' | 'replay' | 'play';
  // typeId?: string;
  // stageId?: string;
  // /** 来自 `getAvailableTournaments` 的 config.mode；resume 时可由 loadGame 的 game.mode 补齐 */
  // mode?: StageModeType;
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
const ComponentCache = new Map<string, React.ComponentType<PlayProps>>();
const getCachedComponent = (path: string): React.ComponentType<PlayProps> => {
  if (!ComponentCache.has(path)) {
    const normalizedPath = path.startsWith('./') ? path : `./${path}`;

    // 检查是否有静态映射
    if (componentMap[normalizedPath]) {
      ComponentCache.set(path, lazy(async () => {
        // console.log(`Loading component from static map: ${normalizedPath}`);
        try {
          return await componentMap[normalizedPath]();
        } catch (error) {
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PlayProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
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
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: (props: PlayProps) => <ErrorComponent path={normalizedPath} error={error as Error} />
          };
        }
      }));
    }
  }
  return ComponentCache.get(path)!;
};

const loading = <div className="play-tournament-loading">Loading...</div>

const PlayTournament: React.FC<ModalProp> = ({ visible, data, close }) => {

  const { gameType, playMode, gameData } = (data ?? {}) as PlayProps;
  const SelectedComponent = useMemo(() => {
    if (!data?.gameType || !visible) return null;
    const path = GAME_PROVIDERS[data?.gameType] ?? '';
    if (path === '') return null;
    return getCachedComponent(path);
  }, [data, visible]);
  // console.log("PlayTournament data", visible, data, SelectedComponent);

  return (
    <>
      {SelectedComponent && <Suspense fallback={loading}>
        <SelectedComponent close={close} gameType={gameType ?? 'tacticalMonster'} playMode={playMode ?? 'join'} gameData={gameData ?? {}} />
      </Suspense>}
    </>
  );
};
export default PlayTournament;
