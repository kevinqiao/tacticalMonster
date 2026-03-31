import { api } from "@/convex/tacticalMonster/convex/_generated/api";
import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import React, { useCallback, useEffect, useState } from "react";
import { useCombatManager } from "../../../service/CombatManager";

import "./styles.css";

/** 3D 结算：拉取 gameOver 报告；Tournament 同步由服务端 checkAndUpdateGameStatus 胜利时调度 HTTP /submitScore */
const GameOver: React.FC = () => {
    const { closeAll } = useModalManager();
    const convex = useConvex();
    const { game } = useCombatManager();
    const gameId = game?.gameId ?? "";

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [report, setReport] = useState<{
        totalScore: number;
        isFirstClear?: boolean;
    } | null>(null);

    useEffect(() => {
        if (!gameId || !convex) return;
        let cancelled = false;
        setLoading(true);
        convex
            .mutation((api as any).service.game.gameService.gameOver, { gameId })
            .then((res: any) => {
                if (cancelled) return;
                setLoading(false);
                if (res?.ok && res?.data) {
                    setReport({
                        totalScore: res.data.totalScore ?? 0,
                        isFirstClear: res.data.isFirstClear,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId, convex]);

    const handleSubmit = useCallback(async () => {
        if (!report || !convex || !gameId || submitting || submitted) return;
        setSubmitting(true);
        try {
            const res = await convex.action((api as any).proxy.controller.submitScore, {
                gameId,
                score: report.totalScore,
                isFirstClear: report.isFirstClear,
            });
            if (res?.ok) setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    }, [report, convex, gameId, submitting, submitted]);

    const handleClose = useCallback(() => {
        closeAll();
    }, [closeAll]);

    return (
        <div className="game-over-container">
            {loading && <div className="game-over-loading">Loading...</div>}
            {!loading && report && (
                <>
                    <div className="game-over-report">
                        <div>Score: {report.totalScore}</div>
                        {report.isFirstClear && <div>First Clear!</div>}
                    </div>
                    <div className="game-over-actions">
                        <button
                            className="game-over-button"
                            onClick={() => void handleSubmit()}
                            disabled={submitting || submitted}
                        >
                            {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit Score (retry)"}
                        </button>
                        <button className="game-over-button" onClick={handleClose}>
                            Close
                        </button>
                    </div>
                </>
            )}
            {!loading && !report && (
                <div className="game-over-report">
                    <div>Could not load results.</div>
                    <button className="game-over-button" onClick={handleClose}>
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};
export default GameOver;
