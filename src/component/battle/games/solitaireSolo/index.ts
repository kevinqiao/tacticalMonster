/**
 * 单人纸牌模块入口（供 `component/battle/games/solitaireSolo` 路径解析）
 */
export { default as SoloGame } from './battle/SoloGame';
export { default as SoloGameProvider, useSoloGameManager } from './battle/service/GameManager';
export { default as SoloDnDProvider, useSoloDnDManager } from './battle/service/SoloDnDProvider';
export { default as SoloDnDCard } from './battle/view/SoloDnDCard';
export { default as SoloRuleManager } from './battle/service/SoloRuleManager';
export * from './battle/types/SoloTypes';
import './battle/style.css';
