import { api } from "@/convex/tacticalMonster/convex/_generated/api";
import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import React, { useCallback, useEffect, useState } from "react";
import { GameOverProps } from "../../GameOver";
import "./styles.css";

interface GameReport {
    gameId: string;
    totalScore: number;
    isFirstClear?: boolean;
}

const TacticalMonsterOver: React.FC<GameOverProps> = ({ gameId }) => {
    const { closeAll } = useModalManager();
    const convex = useConvex();
    const [report, setReport] = useState<GameReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!gameId || !convex) return;
        let cancelled = false;
        setLoading(true);
        convex.mutation((api as any).service.game.gameService.gameOver, { gameId }).then((res) => {
            if (cancelled) return;
            setLoading(false);
            if (res?.ok && res?.data) {
                setReport({
                    gameId: res.data.gameId,
                    totalScore: res.data.totalScore ?? 0,
                    isFirstClear: res.data.isFirstClear,
                });
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [gameId, convex]);

    const handleSubmit = useCallback(async () => {
        if (!report || !convex || submitting || submitted) return;
        setSubmitting(true);
        try {
            const res = await convex.action((api as any).proxy.controller.submitScore, {
                gameId: report.gameId,
                score: report.totalScore,
                isFirstClear: report.isFirstClear,
            });
            if (res?.ok) {
                setSubmitted(true);
            }
        } finally {
            setSubmitting(false);
        }
    }, [report, convex, submitting, submitted]);

    const handleClose = useCallback(() => {
        closeAll();
    }, [closeAll]);

    return (
        <div className="tactical-monster-over-container">
            {loading && <div className="tactical-monster-over-loading">Loading...</div>}
            {!loading && report && (
                <>
                    <div className="tactical-monster-over-report">
                        <div>Score: {report.totalScore}</div>
                        {report.isFirstClear && <div>First Clear!</div>}
                    </div>
                    <div className="tactical-monster-over-actions">
                        {!submitted ? (
                            <button
                                className="team-layout-button"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Submit Score"}
                            </button>
                        ) : (
                            <div className="tactical-monster-over-submitted">Submitted</div>
                        )}
                        <button className="team-layout-button" onClick={handleClose}>
                            Close
                        </button>
                    </div>
                </>
            )}
            {!loading && !report && (
                <button className="team-layout-button" onClick={handleClose}>
                    Close
                </button>
            )}
        </div>
    );
};
export default TacticalMonsterOver;
