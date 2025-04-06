import React, { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { useSSAManager } from '../../../../service/SSAManager';


interface SpriteContextType {
    registerRef: (id: string, isCustomId: boolean) => { id: string; ref: React.RefObject<HTMLDivElement> };
    markSpriteLoaded: (id: string) => void;
    allSpritesLoaded: boolean;
    spriteRefs: Map<string, React.RefObject<HTMLDivElement>>;
}

const SpriteContext = createContext<SpriteContextType | undefined>(undefined);

interface SpriteProviderProps {
    children: ReactNode;
}

export const SpriteProvider: React.FC<SpriteProviderProps> = ({ children }) => {
    const [spriteLoaded, setSpriteLoaded] = useState<Set<string>>(new Set());
    const divRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
    const customIdDivs = useRef<Set<string>>(new Set()); // 只存储自定义 id 的 div
    const { player } = useSSAManager();
    console.log("player", player);

    const registerRef = useCallback((id: string, isCustomId: boolean) => {
        if (!divRefs.current.has(id)) {
            divRefs.current.set(id, React.createRef<HTMLDivElement>());
            if (isCustomId) {
                customIdDivs.current.add(id); // 仅自定义 id 计入总数
            }
        }
        return { id, ref: divRefs.current.get(id)! };
    }, []);

    const markSpriteLoaded = useCallback((id: string) => {
        if (customIdDivs.current.has(id)) {
            setSpriteLoaded((prev) => new Set(prev).add(id));
        }
    }, []);



    const allSpritesLoaded =
        spriteLoaded.size === customIdDivs.current.size &&
        customIdDivs.current.size > 0;

    const value: SpriteContextType = {
        registerRef,
        markSpriteLoaded,
        allSpritesLoaded,
        spriteRefs: divRefs.current,
    };

    return <SpriteContext.Provider value={value}>{children}</SpriteContext.Provider>;
};

export const useSprite = (): SpriteContextType => {
    const context = useContext(SpriteContext);
    if (!context) {
        throw new Error('useSprite must be used within a SpriteProvider');
    }
    return context;
};