import { useModalManager } from "@/service/ModalManager";
import { useConvex } from "convex/react";
import React, { useCallback, useState } from "react";

import "./styles.css";



const GameOver: React.FC = () => {
    const { closeAll } = useModalManager();
    const convex = useConvex();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);



    const handleSubmit = useCallback(() => {
        console.log("submit");
    }, []);

    const handleClose = useCallback(() => {
        closeAll();
    }, [closeAll]);

    return (
        <div className="game-over-container">

            <>
                <div className="game-over-report">
                    <div>Score: 100</div>
                    <div>First Clear!</div>
                </div>
                <div className="game-over-actions">

                    <button
                        className="game-over-button"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        Submit Score
                    </button>

                    <button className="game-over-button" onClick={handleClose}>
                        Close
                    </button>
                </div>
            </>

            <button className="game-over-button" onClick={handleClose}>
                Close
            </button>

        </div>
    );
};
export default GameOver;
