import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import BlockBlastGame from './BlockBlastGame';

/**
 * 弹层内 Block Blast 入口：`RenderModal` 按路径懒加载。
 * 休闲平台须先 `joinTournament` 取得 `casualMatchGameId`；仅传模板 id 不开局（防无经济「练习」）。
 */
const PlayBlockBlast: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;
    const casualTournamentId =
        typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
    const casualMatchGameId =
        typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

    if (casualTournamentId && !casualMatchGameId) {
        return (
            <div
                role="alert"
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    background: 'rgba(0,0,0,0.72)',
                    color: '#fff',
                    zIndex: 10000,
                }}
            >
                <div style={{ maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 16px' }}>
                        请先在 Play 报名「日榜单人挑战」或锦标，再进入对局。
                    </p>
                    <button type="button" onClick={close} style={{ padding: '8px 16px' }}>
                        关闭
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BlockBlastGame
            casualTournamentId={casualTournamentId}
            casualMatchGameId={casualMatchGameId}
            onGameSubmit={close}
        />
    );
};

export default PlayBlockBlast;
