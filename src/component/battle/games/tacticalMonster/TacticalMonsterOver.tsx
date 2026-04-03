import { api } from "@/convex/tacticalMonster/convex/_generated/api";
import { useModalManager } from "@/service/ModalManager";
import { useConvex, useQuery } from "convex/react";
import React, { useCallback, useState } from "react";
import { GameOverProps } from "../../GameOver";
import "./styles.css";

const TacticalMonsterOver: React.FC<GameOverProps> = ({ gameId }) => {
    const { closeAll } = useModalManager();
    const convex = useConvex();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const game = useQuery(
        (api as any).service.game.gameService.getGame,
        gameId ? { gameId } : "skip"
    );

    const totalScore = game?.score ?? 0;

    const handleSubmit = useCallback(async () => {
        if (!gameId || !convex || submitting || submitted) return;
        setSubmitting(true);
        try {
            const res = await convex.action((api as any).proxy.controller.submitScore, {
                gameId,
                score: totalScore,
            });
            if (res?.ok) {
                setSubmitted(true);
            }
        } finally {
            setSubmitting(false);
        }
    }, [gameId, convex, submitting, submitted, totalScore]);

    const handleClose = useCallback(() => {
        closeAll();
    }, [closeAll]);

    if (game === undefined) {
        return (
            <div className="tactical-monster-over-container">
                <div className="tactical-monster-over-loading">Loading...</div>
            </div>
        );
    }

    if (game === null) {
        return (
            <div className="tactical-monster-over-container">
                <button className="team-layout-button" onClick={handleClose}>
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="tactical-monster-over-container">
            <div className="tactical-monster-over-report">
                <div>Score: {totalScore}</div>
            </div>
            <div className="tactical-monster-over-actions">
                {!submitted ? (
                    <button
                        className="team-layout-button"
                        onClick={() => void handleSubmit()}
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
        </div>
    );
};
export default TacticalMonsterOver;
