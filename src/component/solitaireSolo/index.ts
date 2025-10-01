/**
 * 单人纸牌游戏模块导出
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

// 主组件
// export { default as SoloGame } from './battle/SoloGame';
// export { default as SoloPlayer } from './battle/SoloPlayer';

// 服务组件
export { default as SoloGameProvider, useSoloGameManager } from './battle/service/GameManager';
export { default as SoloDnDProvider, useSoloDnDManager } from './battle/service/SoloDnDProvider';


// 视图组件
export { default as SoloDnDCard } from './battle/view/SoloDnDCard';


// 工具类
export { default as SoloRuleManager } from './battle/service/SoloRuleManager';

// 类型定义
export * from './battle/types/SoloTypes';

// 样式
import './battle/style.css';

