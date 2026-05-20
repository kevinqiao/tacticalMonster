/**
 * 单人纸牌游戏主界面组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import { SoloGameEngine } from '@/convex/solitaireArena/convex/service/SoloGameEngine';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useSoloGameManager } from './service/GameManager';
import useActHandler from './service/handler/useActHandler';
import { useSoloDnDManager } from './service/SoloDnDProvider';

import {
    CasualGameScoreReportOverlay,
} from '../../shared/CasualGameScoreReportOverlay';
import {
    CasualPostSettleSummaryOverlay,
} from '../../shared/CasualPostSettleSummaryOverlay';
import {
    MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE,
    ManualSettleConfirmOverlay,
} from '../../shared/ManualSettleConfirmOverlay';
import './style.css';
import {
    CARD_SUITS,
    GameInteractionPhase,
    SoloBoardDimension,
    SoloGameStatus,
    SUIT_ICONS,
    ZoneType
} from './types/SoloTypes';
import { layoutAllSoloCardsFromModel } from './soloCardLayout';
import { tableauCardZIndex } from './Utils';
import { useGameVisualTheme } from '../../shared/visualTheme/useGameVisualTheme';
import SoloDnDCard from './view/SoloDnDCard';
import SoloGameHeader from './view/SoloGameHeader';

const SoloPlayer: React.FC<{ onGameLoadComplete?: () => void }> = ({ onGameLoadComplete }) => {
    const visualTheme = useGameVisualTheme('solitaire');
    /** 整局在 animating+DEALED 下只批量补跑一次牌位（与原先各 SoloDnDCard 的 postDealLayoutOnce 等价）。 */
    const postDealBatchLayoutDoneRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardSurfaceRef = useRef<HTMLDivElement>(null);
    const talonZoneRef = useRef<HTMLDivElement | undefined>(undefined);
    const wasteZoneRef = useRef<HTMLDivElement | undefined>(undefined);
    const foundationSlotRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: 4 }, () => null));
    const tableauColRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: 7 }, () => null));
    const {
        gameState,
        config,
        updateBoardDimension,
        interactionPhase,
        loadGame,
        boardDimension,
        boardDimensionRef,
    } = useSoloGameManager();
    const { cards } = gameState || {};
    const displayScore = gameState != null ? gameState.score : null;
    const displayMoves = gameState != null ? gameState.moves : null;
    /** 动画中禁用「结束」，终局仍允许点击以便结算失败时重试 */
    const endGameDisabled = interactionPhase !== GameInteractionPhase.idle;

    const {
        recycle,
        runAutoCompleteToFoundation,
        settleManuallyAndExit,
        settleConfirmOpen,
        cancelSettleConfirm,
        confirmSettleAndExit,
        finishManualSettleSuccess,
        postCasualScoreReportOpen,
        postCasualScoreReport,
        dismissPostCasualScoreReport,
        postCasualSummaryOpen,
        postCasualTableSummary,
        postCasualWaitingForPeers,
        dismissPostCasualSummary,
    } = useActHandler();
    const { actionData } = useSoloDnDManager();
    // 响应式断点
    const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    /** 从 CSS 布局后的 DOM 测量各槽位，填充 SoloBoardDimension（坐标相对 board surface，与卡牌 offsetParent 一致） */
    const measureBoardDimension = useCallback((): SoloBoardDimension | null => {
        const board = boardSurfaceRef.current;
        const outer = containerRef.current;
        if (!board || !outer) return null;

        const slots = foundationSlotRefs.current;
        const tabs = tableauColRefs.current;
        const talonEl = talonZoneRef.current;
        const wasteEl = wasteZoneRef.current;
        if (!slots[0] || !slots[1] || !tabs[0] || !tabs[1] || !talonEl || !wasteEl) return null;

        const rel = (el: HTMLElement) => {
            const br = board.getBoundingClientRect();
            const er = el.getBoundingClientRect();
            return {
                x: er.left - br.left,
                y: er.top - br.top,
                width: er.width,
                height: er.height
            };
        };

        const union = (rects: Array<{ x: number; y: number; width: number; height: number }>) => {
            if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 };
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const r of rects) {
                minX = Math.min(minX, r.x);
                minY = Math.min(minY, r.y);
                maxX = Math.max(maxX, r.x + r.width);
                maxY = Math.max(maxY, r.y + r.height);
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        };

        const fRects = slots.filter((s): s is HTMLDivElement => !!s).map(rel);
        const tRects = tabs.filter((t): t is HTMLDivElement => !!t).map(rel);
        if (fRects.length < 4 || tRects.length < 7) return null;

        const r0 = fRects[0];
        const r1 = fRects[1];
        const u0 = tRects[0];
        const u1 = tRects[1];
        const spacingF = Math.max(0, r1.x - (r0.x + r0.width));
        const spacingT = Math.max(0, u1.x - (u0.x + u0.width));
        const spacing = Math.round((spacingF + spacingT) / 2);

        const cardW = Math.min(r0.width, u0.width);
        const cardH = Math.min(r0.height, u0.height);
        if (cardW < 16 || cardH < 22) return null;

        const foundationColX = [fRects[0]!.x, fRects[1]!.x, fRects[2]!.x, fRects[3]!.x] as const;
        const tableauColX = [
            tRects[0]!.x,
            tRects[1]!.x,
            tRects[2]!.x,
            tRects[3]!.x,
            tRects[4]!.x,
            tRects[5]!.x,
            tRects[6]!.x
        ] as const;

        const outerRect = outer.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        const w = outerRect.width;
        const nextSize: 'mobile' | 'tablet' | 'desktop' =
            w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
        setScreenSize((prev) => (prev !== nextSize ? nextSize : prev));

        return {
            left: boardRect.left,
            top: boardRect.top,
            width: board.clientWidth,
            height: board.clientHeight,
            cardWidth: Math.round(cardW),
            cardHeight: Math.round(cardH),
            spacing,
            foundationColX,
            tableauColX,
            zones: {
                foundations: union(fRects),
                talon: rel(talonEl),
                waste: rel(wasteEl),
                tableau: union(tRects)
            }
        };
    }, []);

    useLayoutEffect(() => {
        const board = boardSurfaceRef.current;
        const outer = containerRef.current;
        if (!board || !outer) return;

        const runMeasure = () => {
            const dimension = measureBoardDimension();
            if (dimension) updateBoardDimension(dimension);
        };

        runMeasure();
        // 首屏：父级 flex、字体、dvh/1fr 网格常在后续帧才稳定；只测一次会错位，调窗口后 RO 才纠正
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                runMeasure();
                requestAnimationFrame(() => {
                    runMeasure();
                });
            });
        });

        let cancelled = false;
        const lateId = window.setTimeout(() => {
            if (!cancelled) runMeasure();
        }, 80);

        if (typeof document !== 'undefined' && document.fonts?.ready) {
            void document.fonts.ready.then(() => {
                if (!cancelled) runMeasure();
            });
        }

        const ro = new ResizeObserver(() => {
            runMeasure();
        });
        ro.observe(board);
        ro.observe(outer);

        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const onVv = () => {
            if (!cancelled) runMeasure();
        };
        if (vv) {
            vv.addEventListener('resize', onVv);
            vv.addEventListener('scroll', onVv);
        }

        return () => {
            cancelled = true;
            window.clearTimeout(lateId);
            if (vv) {
                vv.removeEventListener('resize', onVv);
                vv.removeEventListener('scroll', onVv);
            }
            ro.disconnect();
        };
    }, [measureBoardDimension, updateBoardDimension, gameState?.gameId]);

    useLayoutEffect(() => {
        postDealBatchLayoutDoneRef.current = false;
    }, [gameState?.gameId]);

    useLayoutEffect(() => {
        if (!gameState || !boardDimension || !boardDimensionRef.current) return;
        if (interactionPhase === GameInteractionPhase.pointerDrag) return;

        const st = gameState.status as SoloGameStatus | number | undefined;
        const isDealed = st === SoloGameStatus.DEALED || Number(st) === SoloGameStatus.DEALED;
        const allMounted =
            gameState.cards.length > 0 && gameState.cards.every((c) => c.ele != null);
        const allowWhileAnimatingDeal =
            interactionPhase === GameInteractionPhase.animating &&
            isDealed &&
            !postDealBatchLayoutDoneRef.current &&
            allMounted;

        if (interactionPhase !== GameInteractionPhase.idle && !allowWhileAnimatingDeal) {
            return;
        }

        layoutAllSoloCardsFromModel(gameState, boardDimension, boardDimensionRef);

        if (allowWhileAnimatingDeal) {
            postDealBatchLayoutDoneRef.current = true;
        }
    }, [gameState, boardDimension, boardDimensionRef, interactionPhase]);


    /** 与 `useActHandler.runAutoCompleteToFoundation` 同条件：已发牌、空闲、开启配置且引擎判定可贪心收齐 */
    const showAutoComplete = useMemo(() => {
        if (!gameState || !config.autoComplete) return false;
        const st = Number(gameState.status);
        if (st === SoloGameStatus.COMPLETED || st === SoloGameStatus.CANCELLED) return false;
        const dealt =
            gameState.status === SoloGameStatus.DEALED || Number(gameState.status) === SoloGameStatus.DEALED;
        if (!dealt || interactionPhase !== GameInteractionPhase.idle) return false;
        return SoloGameEngine.canAutoCompleteWithFoundationOnly(gameState);
    }, [gameState, config.autoComplete, interactionPhase]);

    const loadZone = useCallback((zoneId: string, ele: HTMLDivElement | null) => {
        if (!gameState) return;
        const zone = gameState.zones.find(z => z.id === zoneId);
        if (zone) {
            zone.ele = ele;
        }
    }, [gameState]);


    const cleanup = useCallback((event: any) => {
        if (!gameState || interactionPhase !== GameInteractionPhase.idle) return;
        const st = Number(gameState.status);
        if (st === SoloGameStatus.COMPLETED || st === SoloGameStatus.CANCELLED) return;
        event.stopPropagation();
        event.preventDefault();
        console.log("cleanup", actionData);
        if (actionData) {
            actionData.card = undefined;
            actionData.cards = undefined;
        }
        recycle();
    }, [gameState, recycle, interactionPhase, actionData]);


    // 渲染基础堆（槽位由 CSS grid 排版，尺寸由 ResizeObserver 测量）
    const renderFoundations = useCallback(() => {
        return CARD_SUITS.map((suit, index) => (
            <div
                key={`foundation-${suit}`}
                ref={(ele) => {
                    foundationSlotRefs.current[index] = ele;
                    loadZone(`foundation-${suit}`, ele);
                }}
                className="foundation-zone foundation-slot"
                data-zone-id={`foundation-${suit}`}
                data-drop-zone="true"
                style={{ gridColumn: `${index + 4} / ${index + 5}` }}
            >
                {gameState ? SUIT_ICONS[suit] : null}
            </div>
        ));
    }, [gameState, loadZone]);

    const renderTalon = useCallback(() => {
        return (
            <div
                className="talon-zone solo-stock-slot"
                ref={(ele) => {
                    talonZoneRef.current = ele ?? undefined;
                    loadZone('talon', ele);
                }}
                onClick={cleanup}
            />
        );
    }, [cleanup, loadZone]);

    const renderWaste = useCallback(() => {
        return (
            <div
                ref={(ele) => {
                    wasteZoneRef.current = ele ?? undefined;
                    loadZone('waste', ele);
                }}
                className="waste-zone solo-waste-area"
            />
        );
    }, [loadZone]);

    const renderTableau = useCallback(() => {
        return Array.from({ length: 7 }, (_, colIndex) => (
            <div
                key={`tableau-col-${colIndex}`}
                ref={(ele) => {
                    tableauColRefs.current[colIndex] = ele;
                    loadZone(`tableau-${colIndex}`, ele);
                }}
                className="tableau-column"
                data-zone-id={`tableau-${colIndex}`}
                data-drop-zone="true"
                style={{ gridColumn: `${colIndex + 1} / ${colIndex + 2}` }}
            />
        ));
    }, [loadZone]);
    const renderCards = useMemo(() => {
        if (!cards) return null;
        return [...cards].sort((a, b) => (a.zoneIndex || 0) - (b.zoneIndex || 0)).map((card, cardIndex) => (
            <SoloDnDCard
                key={card.id}
                card={card}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    zIndex: card.zone === ZoneType.TABLEAU ? tableauCardZIndex(card.zoneId, card.zoneIndex) : card.zoneIndex + 10
                }}
            />
        ))

    }, [cards]);

    // 渲染控制面板

    return (
        <div
            ref={containerRef}
            className="solo-player-container"
            data-game-visual-key={visualTheme.visualKey}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
            }}
        >
            <SoloGameHeader
                displayScore={displayScore}
                displayMoves={displayMoves}
                showAutoComplete={showAutoComplete}
                onAutoComplete={() => {
                    void runAutoCompleteToFoundation();
                }}
                endGameDisabled={endGameDisabled}
                onEndGame={() => {
                    void settleManuallyAndExit();
                }}
            />
            {/* {renderControlPanel()} */}
            <div ref={boardSurfaceRef} className="solo-board-surface">
                <div className="solo-foundation-spacer" aria-hidden />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: "center", position: 'absolute', top: 0, left: 0, width: '30%', height: "100px", backgroundColor: 'transparent' }}>
                    <div style={{ cursor: 'pointer', width: "70px", height: "50px", backgroundColor: 'rgba(38, 76, 243, 0.5)', color: 'white', fontSize: "12px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center" }} onClick={loadGame}>Load</div>
                </div>
                {renderFoundations()}
                {renderTalon()}
                {renderWaste()}
                {renderTableau()}
                <div className="solo-board-cards-layer">{renderCards}</div>
            </div>
            <ManualSettleConfirmOverlay
                open={settleConfirmOpen}
                defaultMessage={MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE}
                onCancel={cancelSettleConfirm}
                onConfirm={confirmSettleAndExit}
                onSuccessClose={finishManualSettleSuccess}
            />
            <CasualGameScoreReportOverlay
                open={postCasualScoreReportOpen}
                report={postCasualScoreReport}
                onConfirm={dismissPostCasualScoreReport}
            />
            <CasualPostSettleSummaryOverlay
                open={postCasualSummaryOpen}
                title="同桌成绩"
                summary={postCasualTableSummary}
                waitingForPeers={postCasualWaitingForPeers}
                onDismiss={dismissPostCasualSummary}
            />
        </div>
    );
    // return <div ref={containerRef} className="solo-player-container"></div>
};

export default SoloPlayer;
