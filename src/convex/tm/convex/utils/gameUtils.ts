import { GameCharacter, GridCell, HexNode, MapModel, ObstacleCell, Player } from "../../../../component/kumu/battle/types/CombatTypes";
import { findPath } from "../../../../component/kumu/battle/utils/PathFind";

const getNextTurn = (currentTurn:{uid:string,character:string},turns:{uid:string,character:string,status:number}[]) => {
    const index = turns.findIndex((t:any)=>t.uid===currentTurn.uid&&t.character===currentTurn.character);
    if(index===-1) return null; 
    return turns[(index+1)%turns.length];
}
const getNextRound = (round:number,rounds:any[])=>{ 
    const index = rounds.findIndex((r:any)=>r.round===round);
    return rounds[(index+1)%rounds.length];
}
const getWalkPath = (characters:GameCharacter[],map:MapModel,from:{q:number,r:number},to:{q:number,r:number})=>{
     const { rows = 0, cols = 0, obstacles = [], disables = [] } = map;
        const gridCells = Array.from({ length: Math.max(0, rows) }, (_, y) =>
            Array.from({ length: Math.max(0, cols) }, (_, x) => ({
                x,
                y,
                walkable: true,
                type: 0,
                gridContainer: null,
                gridGround: null,
                gridWalk: null
            } as GridCell))
        );
       characters.forEach((c:GameCharacter)=>{
        const q = c.q ?? 0;
        const r = c.r ?? 0;
        if (r >= 0 && r < gridCells.length && q >= 0 && q < gridCells[0].length) {
            gridCells[r][q].walkable = false;
            gridCells[r][q].type = 1;
        }
       })   
        // 设置障碍物和禁用格子
        obstacles?.forEach((o: ObstacleCell) => {
            if (o.q >= 0 && o.q < cols && o.r >= 0 && o.r < rows) {
                gridCells[o.r][o.q].walkable = false;
                gridCells[o.r][o.q].type = 1;
            }
        });

   
        const path:HexNode[]  = findPath(gridCells, 
            {x:from.q,y:from.r},
            {x:to.q,y:to.r}
        );
        return path;
}
const getPosition = (game: { challenger: string,challengee:string },map:MapModel, player: Player) => {
    const {cols,rows,obstacles,disables}=map;  
    const positions = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 2 }, (_, q) => ({
            q:player.uid===game.challenger?q:q+(cols-2),
            r
            }))
        ).flat();
    const availablePositions = obstacles&&disables?positions.filter(position => {
        return !obstacles.some(obstacle => obstacle.q === position.q && obstacle.r === position.r) &&
               !disables.some(disable => disable.q === position.q && disable.r === position.r);
    }):positions; 
    const randomPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    return randomPosition;
};
export { getNextRound, getNextTurn, getPosition, getWalkPath };

