import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';

interface SceneContextType {
    registerRef: (id: string, isCustomId: boolean) => { id: string; ref: React.RefObject<HTMLDivElement> };
    markSceneLoaded: (id: string) => void;
    allDivsLoaded: boolean;
    divRefs: Map<string, React.RefObject<HTMLDivElement>>;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

interface SceneProviderProps {
    children: ReactNode;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
    const [sceneLoaded, setSceneLoaded] = useState<Set<string>>(new Set());
    const divRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
    const customIdDivs = useRef<Set<string>>(new Set()); // 只存储自定义 id 的 div

    const registerRef = (id: string, isCustomId: boolean) => {
        if (!divRefs.current.has(id)) {
            divRefs.current.set(id, React.createRef<HTMLDivElement>());
            if (isCustomId) {
                customIdDivs.current.add(id); // 仅自定义 id 计入总数
            }
        }
        return { id, ref: divRefs.current.get(id)! };
    };

    const markSceneLoaded = (id: string) => {
        if (customIdDivs.current.has(id)) {
            setSceneLoaded((prev) => new Set(prev).add(id));
        }
    };



    const allDivsLoaded =
        sceneLoaded.size === customIdDivs.current.size &&
        customIdDivs.current.size > 0;

    const value: SceneContextType = {
        registerRef,
        markSceneLoaded,
        allDivsLoaded,
        divRefs: divRefs.current,
    };

    return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
};

export const useScene = (): SceneContextType => {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error('useScene must be used within a SceneProvider');
    }
    return context;
};