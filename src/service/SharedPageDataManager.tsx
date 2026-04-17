import { MapDimension } from "@/component/battle/games/tacticalMonster/service/TeamDeployManager";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * 共享页面数据的强类型 schema。
 * 后续扩展共享字段时，统一在这里新增 key 即可获得编译期校验。
 * 命名约定：使用 `domain.field`（例如 `lobby.contentRect`, `battle.cameraZoom`）。
 */
export interface SharedPageDataSchema {
  "lobby.layout.portrait": boolean | null;
  "lobby.map.dimension": MapDimension | null;
  "lobby.dimension": { width: number; height: number; } | null;
  "lobby.head.dimension": { width: number; height: number; } | null;
  "lobby.footer.dimension": { width: number; height: number; } | null;
  "lobby.content.dimension": { width: number; height: number; } | null;
}

type SharedDataStore = Partial<SharedPageDataSchema>;
type SharedDataKey = keyof SharedPageDataSchema;

const noopSetShared = <K extends SharedDataKey>(_key: K, _value: SharedPageDataSchema[K]) => undefined;
const noopGetShared = <K extends SharedDataKey>(_key: K): SharedPageDataSchema[K] | undefined => undefined;

interface ISharedPageDataContext {
  sharedData: SharedDataStore;
  setShared: <K extends SharedDataKey>(key: K, value: SharedPageDataSchema[K]) => void;
  getShared: <K extends SharedDataKey>(key: K) => SharedPageDataSchema[K] | undefined;
  clearShared: (key: SharedDataKey) => void;
  clearNamespace: (namespace: string) => void;
}

const SharedPageDataContext = createContext<ISharedPageDataContext>({
  sharedData: {},
  setShared: noopSetShared,
  getShared: noopGetShared,
  clearShared: () => undefined,
  clearNamespace: () => undefined,
});

export const SharedPageDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [sharedData, setSharedData] = useState<SharedDataStore>({});

  const setShared = useCallback(
    <K extends SharedDataKey>(key: K, value: SharedPageDataSchema[K]) => {
      setSharedData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const getShared = useCallback(
    <K extends SharedDataKey>(key: K): SharedPageDataSchema[K] | undefined => {
      return sharedData[key] as SharedPageDataSchema[K] | undefined;
    },
    [sharedData]
  );

  const clearShared = useCallback((key: SharedDataKey) => {
    setSharedData((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearNamespace = useCallback((namespace: string) => {
    const prefix = `${namespace}.`;
    setSharedData((prev) => {
      const entries = Object.entries(prev).filter(([key]) => !key.startsWith(prefix));
      return Object.fromEntries(entries) as SharedDataStore;
    });
  }, []);

  const value = useMemo(
    () => ({
      sharedData,
      setShared,
      getShared,
      clearShared,
      clearNamespace,
    }),
    [sharedData, setShared, getShared, clearShared, clearNamespace]
  );

  return <SharedPageDataContext.Provider value={value}>{children}</SharedPageDataContext.Provider>;
};

export const useSharedPageData = () => useContext(SharedPageDataContext);

export const useSharedValue = <K extends SharedDataKey>(key: K): SharedPageDataSchema[K] | undefined => {
  const { sharedData } = useSharedPageData();
  return sharedData[key] as SharedPageDataSchema[K] | undefined;
};

