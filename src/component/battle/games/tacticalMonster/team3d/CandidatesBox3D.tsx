/**
 * CandidatesBox3D 组件
 * 候选怪物列表（保持 2D UI，作为 HTML overlay）
 */

import React, { useMemo } from "react";
import { useTeamDeployManager } from "../team/service/TeamDeployManager";
import CandidatesBox from "../team/CandidatesBox";

interface CandidatesBox3DProps {
    onSelect: (monsterId: string) => void;
}

/**
 * CandidatesBox3D 保持为 2D UI 组件
 * 因为候选列表更适合作为 HTML overlay 显示在 Canvas 上方
 */
const CandidatesBox3D: React.FC<CandidatesBox3DProps> = ({ onSelect }) => {
    // 直接复用现有的 2D CandidatesBox 组件
    // 它会被渲染在 Canvas 上方的 HTML 层
    return <CandidatesBox onSelect={onSelect} />;
};

export default CandidatesBox3D;
