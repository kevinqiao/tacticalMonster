import { useCallback } from 'react';
import { useCombatManager } from '../service/CombatManager';

const gridPropertyMap = {
  container: 'gridContainer',
  ground: 'gridGround',
  stand: 'gridStand',
  attack: 'gridAttack'
} as const;

export const useGridElementLoader = (
  elementType: keyof typeof gridPropertyMap,
  row: number,
  col: number
) => {
  const { gridCells, setResourceLoad } = useCombatManager();

  return useCallback((ele: any) => {
    if (!gridCells || !ele) return;
    
    const cell = gridCells[row][col];
    if (cell) {
      cell[gridPropertyMap[elementType]] = ele;
    }

    const loaded = gridCells.every(row => 
      row.every(item => item[gridPropertyMap[elementType]])
    );

    if (loaded) {
      setResourceLoad(pre => ({
        ...pre,
        [gridPropertyMap[elementType]]: pre[gridPropertyMap[elementType]] === 0 ? 1 : pre[gridPropertyMap[elementType]]
      }));
    }
  }, [gridCells, row, col, setResourceLoad, elementType]);
}; 