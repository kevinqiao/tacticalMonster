import React from "react";
import { phaseLabel } from "../../utils/pedagogyDynamicGuide";
import type { BattleVenuePedagogySnapshot } from "../hooks/useBattleVenuePedagogy";

/**
 * 引导主面板（步骤/动态引导）与 tutorialNotes 条，叠在战场上方。
 */
export const BattleVenuePedagogyOverlays: React.FC<{
    skillError: string | null;
    pedagogy: BattleVenuePedagogySnapshot;
}> = ({ skillError, pedagogy }) => {
    const topOffset = skillError ? 44 : 10;

    return (
        <>
            {pedagogy.showPedagogyGuidePanel && (
                <div
                    style={{
                        position: "absolute",
                        top: topOffset,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 21,
                        maxWidth: "92%",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(20, 60, 100, 0.92)",
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 12,
                        lineHeight: 1.4,
                        textAlign: "center",
                        pointerEvents: "auto",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                    }}
                >
                    <div>
                        {pedagogy.isDynamicGuide && pedagogy.dynamicGuidePayload
                            ? pedagogy.dynamicGuidePayload.text
                            : pedagogy.guideCurrentStep?.text}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, opacity: 0.85 }}>
                        {pedagogy.isDynamicGuide && pedagogy.dynamicGuidePayload
                            ? `当前阶段：${phaseLabel(pedagogy.dynamicGuidePayload.phase)}`
                            : `步骤 ${pedagogy.guideStepIndex != null ? pedagogy.guideStepIndex + 1 : 0}/${pedagogy.guideTotalSteps}`}
                    </div>
                    {pedagogy.showSkipGuideButton && (
                        <button
                            type="button"
                            onClick={pedagogy.skipPedagogyGuide}
                            style={{
                                marginTop: 8,
                                padding: "4px 12px",
                                fontSize: 11,
                                borderRadius: 4,
                                border: "1px solid rgba(255,255,255,0.4)",
                                background: "rgba(0,0,0,0.25)",
                                color: "#fff",
                                cursor: "pointer",
                            }}
                        >
                            跳过引导
                        </button>
                    )}
                </div>
            )}
            {pedagogy.showPedagogyTutorialNotesStrip &&
                pedagogy.pedagogyHint &&
                (pedagogy.pedagogyHint.tutorialNotes ||
                    (pedagogy.pedagogyHint.loanMonsterIds && pedagogy.pedagogyHint.loanMonsterIds.length > 0)) && (
                    <div
                        style={{
                            position: "absolute",
                            top: topOffset,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                            maxWidth: "92%",
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: "rgba(0,40,80,0.85)",
                            color: "rgba(255,255,255,0.95)",
                            fontSize: 11,
                            lineHeight: 1.35,
                            textAlign: "center",
                            pointerEvents: "none",
                        }}
                    >
                        {pedagogy.pedagogyHint.tutorialNotes && (
                            <div>{pedagogy.pedagogyHint.tutorialNotes}</div>
                        )}
                        {pedagogy.pedagogyHint.loanMonsterIds && pedagogy.pedagogyHint.loanMonsterIds.length > 0 && (
                            <div style={{ marginTop: 4, opacity: 0.9 }}>
                                试用角色（编队接入后可自动上场）: {pedagogy.pedagogyHint.loanMonsterIds.join(", ")}
                            </div>
                        )}
                    </div>
                )}
        </>
    );
};
