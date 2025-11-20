/**
 * Tactical Monster 游戏主入口组件
 * 基于 solitaireSolo 的架构模式实现
 */

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import BattlePlayer from './BattlePlayer';
import CombatManager from './service/CombatManager';
import { EventProvider } from './service/EventProvider';
import './style.css';

interface TacticalMonsterGameProps {
    gameId?: string;
    config?: any;
    className?: string;
    style?: React.CSSProperties;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const convex_url = "https://artful-chipmunk-59.convex.cloud"; // TODO: 更新为实际的 Convex URL

const TacticalMonsterGame: React.FC<TacticalMonsterGameProps> = ({
    gameId,
    config,
    className = '',
    style,
    onGameLoadComplete,
    onGameSubmit
}) => {
    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);

    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager gameId={gameId} config={config} onGameLoadComplete={onGameLoadComplete} onGameSubmit={onGameSubmit}>
                    <EventProvider>
                        <BattlePlayer gameId={gameId} />
                    </EventProvider>
                </CombatManager>
            </ConvexProvider>
        </div>
    );
};

export default TacticalMonsterGame;


