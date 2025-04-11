import React, { useCallback, useEffect, useMemo } from 'react';
import { useUserManager } from 'service/UserManager';
import useActionAnimate from '../../animation/useActionAnimate';
import { useCombatManager } from '../../service/CombatManager';
import { useSkillManager } from '../../service/CombatSkillProvider';
import { SkillStatus } from '../../types/PlayerTypes';
import { cardCoord } from '../../utils';
const SkillSteal: React.FC = () => {
    const { user } = useUserManager();
    const { game, direction, boardDimension } = useCombatManager();
    const { activeSkill, updateActiveSkill, completeActiveSkill } = useSkillManager();
    const { playMove } = useActionAnimate();
    const source = useMemo(() => {
        if (!boardDimension || activeSkill?.status !== SkillStatus.Init || activeSkill?.data?.selectedSource) return [];
        return activeSkill?.initialData?.source.map((sid: string) => {
            const card = game?.cards?.find((c) => c.id === sid);
            if (!card) return null;
            const coord = cardCoord(card.field || -1, card.col || 0, card.row || 0, boardDimension, direction || 0);
            return { ...coord, id: card.id };
        })
    }, [activeSkill, boardDimension, direction])
    const target = useMemo(() => {
        if (!boardDimension || !user || activeSkill?.status !== SkillStatus.Init || activeSkill?.data?.selectedTarget) return [];
        return activeSkill?.initialData?.target.map((sid: string) => {
            const card = game?.cards?.find((c) => c.id === sid);
            if (!card) return null;
            const coord = cardCoord(card.field || -1, card.col || 0, card.row || 0, boardDimension, direction || 0);
            return { ...coord, id: card.id };
        })

    }, [user, activeSkill, boardDimension, direction])
    useEffect(() => {
        if (activeSkill?.status === SkillStatus.Completed) {
            console.log("completedactiveSkill", activeSkill)
            const { open, move } = activeSkill.data;
            if (move) {

                const moveCards = move.map((m: any) => {
                    const card = game?.cards?.find((c) => c.id === m.id);
                    if (card) {
                        card.field = m.field;
                        card.col = m.col;
                        card.row = m.row;

                    }
                    return card;
                })
                const openCards = open.map((o: any) => {
                    const card = game?.cards?.find((c) => c.id === o.id);
                    if (card) {
                        card.status = 1;
                        card.suit = o.suit;
                        card.rank = o.rank;

                    }
                    return card;
                })

                playMove({
                    data: { move: moveCards, open: openCards }, onComplete: () => {
                        updateActiveSkill(null);
                    }
                })

            }
        }
    }, [game, activeSkill, updateActiveSkill])
    const selectSource = useCallback((c: any) => {
        if (!activeSkill || !user || !user.uid) return;
        activeSkill.data = activeSkill.data || {};
        activeSkill.data.selectedSource = c.id;
        updateActiveSkill({ ...activeSkill })

    }, [user, activeSkill, updateActiveSkill])
    const selectTarget = useCallback((c: any) => {
        if (!activeSkill || !user || !user.uid) return;
        activeSkill.data = activeSkill.data || {};
        activeSkill.data.selectedTarget = c.id;
        completeActiveSkill();
    }, [user, activeSkill, completeActiveSkill])

    return (
        // <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }}></div>
        <div style={{ position: "absolute", top: 0, left: 0 }}>
            {source?.map((c: any) => {
                return <div key={c.id} style={{ position: "absolute", top: c.y, left: c.x, width: c.cwidth, height: c.cheight, backgroundColor: "red" }} onClick={() => selectSource(c)}>{c.id}</div>
            })}
            {target?.map((c: any) => {
                return <div key={c.id} style={{ position: "absolute", top: c.y, left: c.x, width: c.cwidth, height: c.cheight, backgroundColor: "green" }} onClick={() => selectTarget(c)}>{c.id}</div>
            })}
        </div>
    );
};


export default SkillSteal;


