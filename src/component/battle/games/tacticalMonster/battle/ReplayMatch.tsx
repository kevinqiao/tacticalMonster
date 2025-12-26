/**
 * Tactical Monster 游戏主入口组件
 * 基于 solitaireSolo 的架构模式实现
 */

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import BattlePlayer from './BattlePlayer';
import CombatManager from './service/CombatManager';
import './style.css';

interface TacticalMonsterGameProps {
    gameId?: string;
    className?: string;
    style?: React.CSSProperties;
    mode?: 'play' | 'watch' | 'replay';  // 游戏模式：游玩 | 实时观看 | 重播
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const convex_url = "https://artful-chipmunk-59.convex.cloud"; // TODO: 更新为实际的 Convex URL

const PlayGame: React.FC<TacticalMonsterGameProps> = ({
    gameId,

    className = '',
    style,
    mode = 'play',  // ✅ 新增：默认 play 模式
    onGameLoadComplete,
    onGameSubmit
}) => {
    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);



    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager gameId={gameId} onGameLoadComplete={onGameLoadComplete} onGameSubmit={onGameSubmit}>
                    <BattlePlayer gameId={gameId} mode={mode} />
                </CombatManager>
            </ConvexProvider>
        </div>
    );
};
const ReplayMatch: React.FC = () => {
    return (
        <div className="play-match-container">
            <PlayGame />
        </div>
    );
};

export default ReplayMatch


