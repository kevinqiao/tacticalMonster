/**
 * Block Blast 模块入口
 */
export { default as BlockBlastGame } from './battle/BlockBlastGame';
export { default as PlayBlockBlast } from './battle/PlayBlockBlast';
export {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BLOCK_BLAST_GRID_PRESETS,
    BlockBlastGridSize,
    inferGridSizeFromGrid,
    normalizeBlockBlastGridSize,
} from './battle/types/BlockBlastTypes';
