/**
 * DragPreview3D 组件
 * 3D 拖拽预览（使用 HTML overlay 显示在 Canvas 上方）
 */

import React from "react";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import DragPreview from "../DragPreview";

/**
 * DragPreview3D 保持为 2D UI 组件
 * 因为拖拽预览更适合作为 HTML overlay 跟随鼠标移动
 */
const DragPreview3D: React.FC = () => {
    // 直接复用现有的 2D DragPreview 组件
    // 它会被渲染在 Canvas 上方的 HTML 层，跟随鼠标移动
    return <DragPreview />;
};

export default DragPreview3D;
