/**
 * 单人纸牌游戏模块导出
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

// 主组件
export { default as SoloGame } from './battle/SoloGame';
export { default as SoloPlayer } from './battle/SoloPlayer';

// 服务组件
export { default as SoloDnDProvider, useSoloDnDManager } from './battle/service/SoloDnDProvider';
export { default as SoloGameProvider, useSoloGameManager } from './battle/service/SoloGameManager';

// 控制组件
export { default as SoloGameControl } from './battle/control/SoloGameControl';

// 视图组件
export { default as SoloDnDCard } from './battle/view/SoloDnDCard';

// 动画Hook
export { default as useSoloCardAnimate } from './battle/animation/useSoloCardAnimate';

// 工具类
export { default as SoloRuleManager } from './battle/service/SoloRuleManager';

// 类型定义
export * from './battle/types/SoloTypes';

// 样式
import './battle/style.css';
