/**
 * 单人纸牌模块入口（供 `component/battle/games/solitaireSolo` 路径解析）
 */
export { default as SoloGameProvider, useSoloGameManager } from './battle/service/GameManager';
export { default as SoloDnDProvider, useSoloDnDManager } from './battle/service/SoloDnDProvider';
export { default as SoloRuleManager } from './battle/service/SoloRuleManager';
export { default as SoloGame } from './battle/SolitaireGame';
export * from './battle/types/SoloTypes';
export { default as SoloDnDCard } from './battle/view/SoloDnDCard';
import './battle/style.css';

