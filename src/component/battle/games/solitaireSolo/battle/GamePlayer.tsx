/**
 * 单人纸牌游戏主界面组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { registerCasualGameModalExitHandler } from '../../shared/casualGameModalExitBridge';
import { useSoloGameManager } from './service/GameManager';
import useActHandler from './service/handler/useActHandler';
import { useSoloDnDManager } from './service/SoloDnDProvider';

import {
    isCasualSoloChallengeFinalScoreReport,
    resolveCasualScoreReportSecondaryAction,
    resolveCasualPostSettleSummaryPresentation,
    resolveCasualPostSettleReplayPresentation,
} from '../../shared/casualGameScoreReportUI';
import { CasualGameScoreReportOverlay } from '../../shared/CasualGameScoreReportOverlay';
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
import { autoCompleteLayoutGate } from './autoCompleteLayoutGate';
import { wasteFanStepPx } from './Utils';
import { useGameVisualTheme } from '../../shared/visualTheme/useGameVisualTheme';
import SoloDnDCard from './view/SoloDnDCard';
import SoloGameHeader from './view/SoloGameHeader';
import SolitaireWatchOverlay from './replay/SolitaireWatchOverlay';

const SoloPlayer: React.FC<{ onGameLoadComplete?: () => void }> = ({ onGameLoadComplete }) => {
    const visualTheme = useGameVisualTheme('solitaire');
    /** 整局在 animating+DEALED 下只批量补跑一次牌位（与原先各 SoloDnDCard 的 postDealLayoutOnce 等价）。 */
    const postDealBatchLayoutDoneRef = useRef(false);
    const [cardMountEpoch, setCardMountEpoch] = useState(0);
    const notifyCardDomChange = useCallback(() => {
        setCardMountEpoch((n) => n + 1);
    }, []);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardSurfaceRef = useRef<HTMLDivElement>(null);
    const talonZoneRef = useRef<HTMLDivElement | undefined>(undefined);
    const wasteZoneRef = useRef<HTMLDivElement | undefined>(undefined);
    const foundationSlotRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: 4 }, () => null));
    const tableauColRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: 7 }, () => null));
    /** 窄屏 compact 字号（屏幕 px）；大屏为空，走 SVG 经典字号 */
    const faceFontCssRef = useRef<{ rank: string; center: string }>({
        rank: "",
        center: "",
    });
    const {
        gameState,
        updateBoardDimension,
        interactionPhase,
        boardDimension,
        boardDimensionRef,
        replayMode,
        targetScore,
        casualTournamentId,
    } = useSoloGameManager();
    const { cards } = gameState || {};
    /** Solitaire Cash：局中 base 可因 recycle 暂为负，展示与结算一致不低于 0 */
    const displayScore =
        gameState != null ? Math.max(0, Math.floor(gameState.score ?? 0)) : null;
    const displayMoves = gameState != null ? gameState.moves : null;

    const {
        recycle,
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
        postCasualWeeklyLeagueSettle,
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        postCasualReplayMode,
        postCasualReplayWindowEndsAt,
        postCasualAdReplayDailyRemaining,
        casualReplayBusy,
        casualReplayError,
        replayCasualRun,
        dismissPostCasualSummary,
        watchTarget,
        watchTargetLabel,
        openWatch,
        closeWatch,
        completeCasualSolitaireRunOnTimeout,
        postSettleLayoutFreezeRef,
    } = useActHandler();

    const postSettlePresentation = useMemo(
        () => resolveCasualPostSettleSummaryPresentation(casualTournamentId, postCasualTableSummary),
        [casualTournamentId, postCasualTableSummary]
    );

    const scoreReportActions = useMemo(
        () =>
            resolveCasualScoreReportSecondaryAction({
                templateId: casualTournamentId,
                replayOffered: postCasualReplayOffered,
                canReplay: postCasualCanReplay,
                replayMode: postCasualReplayMode,
                challengeSuccess: postCasualScoreReport?.challenge?.success,
                adReplayDailyRemaining: postCasualAdReplayDailyRemaining,
            }),
        [
            casualTournamentId,
            postCasualReplayOffered,
            postCasualCanReplay,
            postCasualReplayMode,
            postCasualScoreReport?.challenge?.success,
            postCasualAdReplayDailyRemaining,
        ]
    );

    const showPostSettleSummary =
        postCasualSummaryOpen &&
        !isCasualSoloChallengeFinalScoreReport(casualTournamentId);

    useEffect(() => {
        if (replayMode) return;
        registerCasualGameModalExitHandler(() => {
            void settleManuallyAndExit();
        });
        return () => registerCasualGameModalExitHandler(null);
    }, [replayMode, settleManuallyAndExit]);

    const postSettleReplay = useMemo(
        () =>
            resolveCasualPostSettleReplayPresentation({
                replayOffered: postCasualReplayOffered,
                canReplay: postCasualCanReplay,
                replayMode: postCasualReplayMode,
                adReplayDailyRemaining: postCasualAdReplayDailyRemaining,
                replayWindowEndsAt: postCasualReplayWindowEndsAt,
            }),
        [
            postCasualReplayOffered,
            postCasualCanReplay,
            postCasualReplayMode,
            postCasualAdReplayDailyRemaining,
            postCasualReplayWindowEndsAt,
        ]
    );

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

        let fRects = slots.filter((s): s is HTMLDivElement => !!s).map(rel);
        let tRects = tabs.filter((t): t is HTMLDivElement => !!t).map(rel);
        if (fRects.length < 4 || tRects.length < 7) return null;

        /* 列宽取 tableau 格（始终 1fr），勿用已缩成牌宽的 foundation 槽，否则扁屏后无法回弹 */
        const colW = tRects[0]!.width;
        const boardStyle = getComputedStyle(board);
        const rowGap =
            parseFloat(boardStyle.rowGap) ||
            parseFloat(boardStyle.getPropertyValue('--solo-foundation-tableau-gap')) ||
            0;
        const padY =
            (parseFloat(boardStyle.paddingTop) || 0) + (parseFloat(boardStyle.paddingBottom) || 0);
        const boardInnerH = Math.max(0, board.clientHeight - padY);
        /* 预留 foundation 一行 + 至少一行牌高的 tableau，避免扁屏下槽位仍按列宽撑高、牌被压扁 */
        const CARD_H_OVER_W = 7 / 5;
        /*
         * 竖屏：上下约各半。
         * 横屏矮板：若仍按 /2，foundation 行过高，tableau 被顶到偏下、中间空一大块。
         */
        const landscapeShort =
            board.clientWidth > boardInnerH * 1.1 && boardInnerH > 0 && boardInnerH < 480;
        const heightFrac = landscapeShort ? 0.36 : 0.5;
        const maxCardH = Math.max(28, (boardInnerH - rowGap) * heightFrac);
        let cardW = Math.min(colW, maxCardH / CARD_H_OVER_W);
        let cardH = cardW * CARD_H_OVER_W;
        /* 过小则角标不可读；略抬下限 */
        if (cardW < 20 || cardH < 28) return null;

        const cardWRounded = Math.round(cardW);
        const cardHRounded = Math.round(cardH);
        /* 先同步宽高 CSS 变量并 reflow，再测槽位，保证区与牌同尺 */
        const nextW = `${cardWRounded}px`;
        const nextH = `${cardHRounded}px`;
        const nextFan = `${wasteFanStepPx(cardWRounded)}px`;
        const cssChanged =
            board.style.getPropertyValue('--solo-card-width') !== nextW ||
            board.style.getPropertyValue('--solo-card-height') !== nextH ||
            board.style.getPropertyValue('--solo-waste-fan-step') !== nextFan;
        if (cssChanged) {
            board.style.setProperty('--solo-card-width', nextW);
            board.style.setProperty('--solo-card-height', nextH);
            board.style.setProperty('--solo-waste-fan-step', nextFan);
            void board.offsetHeight;
        }

        /*
         * 窄屏 compact：左上点数 + 中间偏下大花色（屏幕 px）。
         * 大屏：不打标，经典完整牌面（SVG user unit）。
         */
        const compactFace = board.clientWidth > 0 && board.clientWidth < 768;
        const setFlag = (name: string, on: boolean) => {
            const cur = board.getAttribute(name);
            if (on && cur !== "1") board.setAttribute(name, "1");
            else if (!on && cur != null) board.removeAttribute(name);
        };
        setFlag("data-compact-face", compactFace);
        board.removeAttribute("data-face-boost");

        const clampPx = (n: number, lo: number, hi: number) =>
            Math.max(lo, Math.min(hi, Math.round(n)));
        if (compactFace) {
            const rankPx = clampPx(cardHRounded * 0.6, 38, 56);
            const suitLowPx = clampPx(cardHRounded * 0.8, 44, 64);
            faceFontCssRef.current = {
                rank: `${rankPx}px`,
                center: `${suitLowPx}px`,
            };
            board.style.setProperty("--solo-face-rank-px", faceFontCssRef.current.rank);
            board.style.setProperty("--solo-face-center-px", faceFontCssRef.current.center);
        } else {
            faceFontCssRef.current = { rank: "", center: "" };
            board.style.removeProperty("--solo-face-rank-px");
            board.style.removeProperty("--solo-face-center-px");
            board.style.removeProperty("--solo-face-suit-px");
            board.style.removeProperty("--solo-face-corner-px");
        }

        fRects = slots.filter((s): s is HTMLDivElement => !!s).map(rel);
        tRects = tabs.filter((t): t is HTMLDivElement => !!t).map(rel);
        if (fRects.length < 4 || tRects.length < 7) return null;

        const r0 = fRects[0]!;
        const r1 = fRects[1]!;
        const u0 = tRects[0]!;
        const u1 = tRects[1]!;
        const spacingF = Math.max(0, r1.x - (r0.x + r0.width));
        const spacingT = Math.max(0, u1.x - (u0.x + u0.width));
        const spacing = Math.round((spacingF + spacingT) / 2);

        const foundationColX = [fRects[0]!.x, fRects[1]!.x, fRects[2]!.x, fRects[3]!.x] as const;
        /* 扁屏下牌宽可小于 1fr 列宽：tableau 牌与 foundation 一样按列居中 */
        const centerInCol = (r: { x: number; width: number }) =>
            r.x + Math.max(0, (r.width - cardWRounded) / 2);
        const tableauColX = [
            centerInCol(tRects[0]!),
            centerInCol(tRects[1]!),
            centerInCol(tRects[2]!),
            centerInCol(tRects[3]!),
            centerInCol(tRects[4]!),
            centerInCol(tRects[5]!),
            centerInCol(tRects[6]!)
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
            cardWidth: cardWRounded,
            cardHeight: cardHRounded,
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

    const settleUiOpenRef = useRef(false);
    settleUiOpenRef.current =
        postSettleLayoutFreezeRef.current ||
        settleConfirmOpen ||
        postCasualScoreReportOpen ||
        postCasualSummaryOpen;

    useLayoutEffect(() => {
        const board = boardSurfaceRef.current;
        const outer = containerRef.current;
        if (!board || !outer) return;

        let cancelled = false;
        let measureRaf = 0;

        const runMeasure = () => {
            if (cancelled) return;
            const dimension = measureBoardDimension();
            if (dimension) updateBoardDimension(dimension);
        };

        /** RO 回调里同步改 CSS/布局会触发 “ResizeObserver loop …”；合并到下一帧再测 */
        const scheduleMeasure = () => {
            if (cancelled || measureRaf) return;
            // freeze ref 在 setState 前就会写 true；须直接读，不能等下一次 render
            if (postSettleLayoutFreezeRef.current || settleUiOpenRef.current) return;
            measureRaf = requestAnimationFrame(() => {
                measureRaf = 0;
                if (postSettleLayoutFreezeRef.current || settleUiOpenRef.current) return;
                runMeasure();
            });
        };

        runMeasure();
        // 首屏：父级 flex、字体、dvh/1fr 网格常在后续帧才稳定；只测一次会错位，调窗口后 RO 才纠正
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (cancelled) return;
                runMeasure();
                requestAnimationFrame(() => {
                    if (!cancelled) runMeasure();
                });
            });
        });

        const lateId = window.setTimeout(() => {
            if (!cancelled) runMeasure();
        }, 80);

        if (typeof document !== 'undefined' && document.fonts?.ready) {
            void document.fonts.ready.then(() => {
                if (!cancelled) runMeasure();
            });
        }

        const ro = new ResizeObserver(() => {
            scheduleMeasure();
        });
        ro.observe(board);
        ro.observe(outer);
        /* 不观察 waste/talon：改 --solo-card-* 会改它们尺寸，再测再改会形成 RO 死循环 */

        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const onVv = () => {
            scheduleMeasure();
        };
        if (vv) {
            vv.addEventListener('resize', onVv);
            vv.addEventListener('scroll', onVv);
        }

        return () => {
            cancelled = true;
            if (measureRaf) cancelAnimationFrame(measureRaf);
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
        // 自动清盘中：禁止用（可能滞后的）React model 把牌拽回 tableau
        if (autoCompleteLayoutGate.blocked) return;
        // 胜利动画期间：React model 可能仍是清盘前的 tableau，绝不能重排
        if (
            containerRef.current?.getAttribute("data-solo-victory") === "1" ||
            boardSurfaceRef.current?.getAttribute("data-solo-victory") === "1" ||
            document.querySelector(".solo-player-container[data-solo-victory='1'], .solo-board-surface[data-solo-victory='1']")
        ) {
            return;
        }

        const st = gameState.status as SoloGameStatus | number | undefined;
        // 终局胜利动画期间禁止把牌拽回 foundation（否则与 Lab 效果不一致）
        if (
            Number(st) === SoloGameStatus.COMPLETED ||
            Number(st) === SoloGameStatus.CANCELLED
        ) {
            return;
        }

        // 仅发牌阶段允许在 animating 下做一次批量落位；PLAYING 自动清盘时绝不能用旧 model 重排
        const isDealPhase =
            Number(st) === SoloGameStatus.OPEN || Number(st) === SoloGameStatus.DEALED;
        const allMounted =
            gameState.cards.length > 0 && gameState.cards.every((c) => c.ele != null);
        const allowWhileAnimatingDeal =
            isDealPhase &&
            interactionPhase === GameInteractionPhase.animating &&
            !postDealBatchLayoutDoneRef.current &&
            allMounted;

        if (interactionPhase !== GameInteractionPhase.idle && !allowWhileAnimatingDeal) {
            return;
        }

        layoutAllSoloCardsFromModel(gameState, boardDimension, boardDimensionRef);

        if (allowWhileAnimatingDeal) {
            postDealBatchLayoutDoneRef.current = true;
        }
    }, [gameState, boardDimension, boardDimensionRef, interactionPhase, cardMountEpoch]);


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
                style={{ gridColumn: `${index + 1} / ${index + 2}` }}
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
        // 稳定按 id 排序，避免 zone 变化时 React 重排 DOM 冲掉 GSAP transform
        return [...cards]
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
            .map((card) => (
            <SoloDnDCard
                key={card.id}
                card={card}
                onCardDomChange={notifyCardDomChange}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    // z-index 只由 GSAP / soloCardZIndex 管理；React style 会在
                    // setInteractionPhase 重渲染时盖掉飞行层 z，导致左→右首次落子穿到牌堆后
                }}
            />
        ))

    }, [cards, notifyCardDomChange, gameState?.cards]);

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
                dueTime={replayMode ? undefined : gameState?.dueTime}
                targetScore={replayMode ? undefined : targetScore}
                onMatchTimeout={
                    replayMode ? undefined : () => void completeCasualSolitaireRunOnTimeout()
                }
            />
            {/* {renderControlPanel()} */}
            <div
                ref={boardSurfaceRef}
                className={
                    replayMode ? "solo-board-surface solo-board-surface--replay" : "solo-board-surface"
                }
                style={
                    boardDimension
                        ? ({
                              ["--solo-card-width" as string]: `${boardDimension.cardWidth}px`,
                              ["--solo-card-height" as string]: `${boardDimension.cardHeight}px`,
                              ["--solo-waste-fan-step" as string]: `${wasteFanStepPx(boardDimension.cardWidth)}px`,
                              ...(faceFontCssRef.current.rank
                                  ? {
                                        ["--solo-face-rank-px" as string]:
                                            faceFontCssRef.current.rank,
                                        ["--solo-face-center-px" as string]:
                                            faceFontCssRef.current.center,
                                    }
                                  : {}),
                          } as React.CSSProperties)
                        : undefined
                }
            >
                {renderFoundations()}
                {renderWaste()}
                {renderTalon()}
                {renderTableau()}
                <div className="solo-board-cards-layer">{renderCards}</div>
            </div>
            {!replayMode && (
                <>
                    <ManualSettleConfirmOverlay
                        open={settleConfirmOpen && !postCasualScoreReportOpen}
                        defaultMessage={MANUAL_SETTLE_DEFAULT_MESSAGE_SOLITAIRE}
                        onCancel={cancelSettleConfirm}
                        onConfirm={confirmSettleAndExit}
                        onSuccessClose={finishManualSettleSuccess}
                    />
                    <CasualGameScoreReportOverlay
                        open={postCasualScoreReportOpen && watchTarget == null}
                        report={postCasualScoreReport}
                        onConfirm={dismissPostCasualScoreReport}
                        secondaryLabel={
                            scoreReportActions.showReplaySecondary
                                ? scoreReportActions.secondaryLabel
                                : undefined
                        }
                        onSecondary={
                            scoreReportActions.showReplaySecondary
                                ? () => void replayCasualRun()
                                : undefined
                        }
                        secondaryDisabled={
                            scoreReportActions.showReplaySecondary && !postCasualCanReplay
                        }
                        secondaryBusy={casualReplayBusy}
                        adReplayDailyRemaining={
                            scoreReportActions.showReplaySecondary
                                ? scoreReportActions.adReplayDailyRemaining
                                : undefined
                        }
                        secondaryError={casualReplayError ?? undefined}
                        replayWindowEndsAt={
                            scoreReportActions.showReplaySecondary
                                ? postCasualReplayWindowEndsAt
                                : undefined
                        }
                    />
                    <CasualPostSettleSummaryOverlay
                        open={showPostSettleSummary && watchTarget == null}
                        title={postSettlePresentation.title}
                        summary={postSettlePresentation.summary}
                        waitingForPeers={postCasualWaitingForPeers}
                        replayAvailable={postSettleReplay.showReplay}
                        replayMode={postCasualReplayMode}
                        adReplayDailyRemaining={postSettleReplay.adReplayDailyRemaining}
                        replayBusy={casualReplayBusy}
                        replayWindowEndsAt={postCasualReplayWindowEndsAt}
                        onReplay={postSettleReplay.showReplay ? () => void replayCasualRun() : undefined}
                        replayLabel={postSettleReplay.replayLabel}
                        onDismiss={dismissPostCasualSummary}
                        weeklyLeagueSettle={postCasualWeeklyLeagueSettle}
                    />
                    <SolitaireWatchOverlay
                        open={watchTarget != null}
                        watchContext={watchTarget}
                        displayLabel={watchTargetLabel}
                        onClose={closeWatch}
                    />
                </>
            )}
        </div>
    );
    // return <div ref={containerRef} className="solo-player-container"></div>
};

export default SoloPlayer;
