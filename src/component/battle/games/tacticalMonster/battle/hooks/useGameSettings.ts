/**
 * 游戏设置 Hook
 * 管理用户游戏偏好设置（自动移动、移动策略等）
 */

import { useCallback, useState } from "react";

export interface GameSettings {
    autoMove: boolean;  // true: 自动移动, false: 手动移动
    autoMoveStrategy: 'aggressive' | 'defensive' | 'balanced';
}

const DEFAULT_SETTINGS: GameSettings = {
    autoMove: true,  // 默认自动移动
    autoMoveStrategy: 'balanced'
};

const STORAGE_KEY = 'tacticalMonster_gameSettings';

/**
 * 游戏设置 Hook
 * 从 localStorage 读取/保存设置
 */
export const useGameSettings = () => {
    const [settings, setSettings] = useState<GameSettings>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    autoMove: parsed.autoMove ?? DEFAULT_SETTINGS.autoMove,
                    autoMoveStrategy: parsed.autoMoveStrategy ?? DEFAULT_SETTINGS.autoMoveStrategy
                };
            }
        } catch (error) {
            console.warn("Failed to load game settings from localStorage:", error);
        }
        return DEFAULT_SETTINGS;
    });

    const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.warn("Failed to save game settings to localStorage:", error);
        }
    }, [settings]);

    return { settings, updateSettings };
};
