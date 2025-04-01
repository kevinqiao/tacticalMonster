// Countdown.tsx
import React, { CSSProperties, useMemo } from 'react';
import { useCombatManager } from '../../service/CombatManager';
import './countDown.css';
import SceneWrap from './SpriteWrap';
const CountdownGo: React.FC = () => {
    const { boardDimension } = useCombatManager();

    const position = useMemo((): CSSProperties => {
        if (!boardDimension) return {};
        return {
            position: "absolute",
            top: boardDimension.height * 5 / 12,
            left: 0,
            width: boardDimension.width,
            height: boardDimension.height / 6,
            opacity: 0,
            visibility: "hidden",
        };
    }, [boardDimension]);

    return <SceneWrap id="countdown-go" position={position} >
        <div id="countdown-container" className="countdown-container" />
    </SceneWrap>;
};

export default CountdownGo;