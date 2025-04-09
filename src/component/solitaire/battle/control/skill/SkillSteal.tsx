import React, { useMemo } from 'react';
import { useUserManager } from 'service/UserManager';
import { useCombatManager } from '../../service/CombatManager';
import { useSkillManager } from '../../service/CombatSkillProvider';
import { cardCoord } from '../../utils';

const SkillSteal: React.FC = () => {
    const { user } = useUserManager();
    const { game, direction, boardDimension } = useCombatManager();
    const { activeSkill, updateActiveSkill, completeActiveSkill } = useSkillManager();

    const source = useMemo(() => {
        if (!boardDimension) return [];
        return activeSkill?.data?.source.map((sid: string) => {
            const card = game?.cards?.find((c) => c.id === sid);
            if (!card) return null;
            const coord = cardCoord(card.field || -1, card.col || 0, card.row || 0, boardDimension, direction || 0);
            return { ...coord, id: card.id };
        })
    }, [activeSkill, boardDimension, direction])
    const target = useMemo(() => {
        if (!boardDimension || !user) return [];
        return activeSkill?.data?.target.map((sid: string) => {
            const card = game?.cards?.find((c) => c.id === sid);
            if (!card) return null;
            const coord = cardCoord(card.field || -1, card.col || 0, card.row || 0, boardDimension, direction || 0);
            return { ...coord, id: card.id };
        })

    }, [user, activeSkill, boardDimension, direction])

    return (
        // <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }}></div>
        <div style={{ position: "absolute", top: 0, left: 0 }}>
            {source?.map((c: any) => {
                return <div key={c.id} style={{ position: "absolute", top: c.y, left: c.x, width: c.cwidth, height: c.cheight, backgroundColor: "red" }}>{c.id}</div>
            })}
            {target?.map((c: any) => {
                return <div key={c.id} style={{ position: "absolute", top: c.y, left: c.x, width: c.cwidth, height: c.cheight, backgroundColor: "green" }}>{c.id}</div>
            })}
        </div>
    );
};


export default SkillSteal;


