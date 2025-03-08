import React, { useCallback, useMemo } from 'react';
import { useCombatManager } from '../service/CombatManager';
import "./style.css";

const DynamicTile: React.FC<{ x: number, y: number }> = ({ x, y }) => {
  const { game } = useCombatManager();

  const tile = useMemo(() => {
    if (!game || !game.tiles) return null;
    const t = game.tiles.find(item => item.x === x && item.y === y);
    return t;
  }, [game, x, y]);

  const handleClick = useCallback(() => {
    if (tile?.ele) {
      tile.ele.style.opacity = "0";
    }
  }, [tile]);

  return <>
    {tile && tile.type === 0 && <div ref={(ele) => tile.ele = ele} className="star" style={{ position: "absolute", top: 0, left: 0 }} onClick={handleClick} />}
    {tile && tile.type === 1 && <div ref={(ele) => tile.ele = ele} className="triangle-up" onClick={handleClick} />}
    {tile && tile.type === 2 && <div ref={(ele) => tile.ele = ele} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "blue" }} onClick={handleClick} />}
    {tile && tile.type === 3 && <div ref={(ele) => tile.ele = ele} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "green" }} onClick={handleClick} />}
  </>
}
export default DynamicTile;

