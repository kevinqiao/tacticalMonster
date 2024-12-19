import { GridCell, HexNode, MapModel, ObstacleCell } from "../../component/kumu/battle/types/CombatTypes";
import { findPath } from "../../component/kumu/battle/utils/PathFind";
import { internal } from "../_generated/api";
import { Attributes, Stats } from "../model/CharacterModels";
import { calculateStats } from "../utils/Utlis";
interface Player {
    uid: string;
    name?: string;
    avatar?: string;
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

class GameManager {
    private dbCtx: any;
    constructor(ctx: any) {
        this.dbCtx = ctx;
    }
    async createGame() {
        const players = await this.dbCtx.runQuery(internal.dao.tmPlayerDao.findAll);
        if (players.length > 1) {
            const map = await this.dbCtx.runQuery(internal.dao.tmMapDataDao.find, { mapId: "1" });
            const game = { 
                challenger: players[0].uid, 
                challengee: players[1].uid, 
                players:players.map((player:any)=>({uid:player.uid,name:player.name,avatar:player.avatar})),
                map:"1",
                round: 0 
            };
            const gameId = await this.dbCtx.runMutation(internal.dao.tmGameDao.create, game);
            if (gameId) {
                const gameCharacters: any[] = [];
                for (const player of players) {
                 
                    const characters = await this.dbCtx.runQuery(internal.dao.tmPlayerCharacterDao.findAll, { uid: player.uid });
                   
                    for (const character of characters) {
                        const position=getPosition(game,map,player);
                        console.log(position);
                        let gameCharacter: any={...character,...position,gameId};
                        const { character_id, level } = character;
                        const characterData = await this.dbCtx.runQuery(internal.dao.tmCharacterDataDao.find, { character_id });
                        if (characterData) {
                            const levelData = await this.dbCtx.runQuery(internal.dao.tmLevelDataDao.findByLevel, { character_id, level });
                            if (levelData?.attributes) {
                                const attributes = levelData.attributes as Attributes
                                const stats: Stats = calculateStats(attributes);
                                const { move_range, attack_range } = characterData;
                                gameCharacter = { ...character,...position, move_range, attack_range, stats, gameId, _id: undefined, _creationTime: undefined, asset: undefined }
                            }
                            await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.create, gameCharacter);
                        }
                        gameCharacters.push(gameCharacter);
                    }

                }
                const turns = gameCharacters.map(character => ({
                    uid: character.uid,
                    character_id: character.character_id,
                    status: 0
                }));
                const timeClock=30;
                const round = {
                    gameId,
                    no: 1,
                    status: 0,
                    turns
                };
                const roundId=await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.create,round);
                const gameUpdated={id:gameId,data:{round:round.no,lastUpdate:Date.now()}};
                await this.dbCtx.runMutation(internal.dao.tmGameDao.update,gameUpdated);   
                for(const player of players){                    
                    const event = { uid: player.uid, name: "GameCreated", data: { gameId } };
                    await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
                }
                const roundEvent={gameId,name:"roundStart",data:{round:round.no}};
                await this.dbCtx.runMutation(internal.dao.tmEventDao.create, roundEvent);
                const turnEvent={gameId,name:"turnStart",data:{turn:0}};
                await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);
            }
        }
    }
    async walk(gameId: string, uid: string, character_id: string, to: {q: number, r: number}): Promise<boolean> {
      
        const game = await this.dbCtx.runQuery(internal.dao.tmGameDao.find, { gameId });                
        if (!game || !uid || !game.map) return false;

        // 构建 gridCells
        const { rows = 0, cols = 0, obstacles = [], disables = [] } = game.map;
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

        // 设置障碍物和禁用格子
        obstacles?.forEach((o: ObstacleCell) => {
            if (o.q >= 0 && o.q < cols && o.r >= 0 && o.r < rows) {
                gridCells[o.r][o.q].walkable = false;
                gridCells[o.r][o.q].type = 1;
            }
        });

        const character = game.characters.find((c:any) => 
            c.character_id === character_id && c.uid === uid
        );

        if (!character) return false;
        const {q,r} = character;
        if(!q||!r) return false;
        const path:HexNode[]  = findPath(gridCells, 
            { x: q, y: r },
            { x: to.q, y: to.r }
        );
        if(path.length>0){
            await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.update, {id:character.id ,data:{q:to.q,r:to.r}});
            const event={gameId,name:"walk",data:{path}};
            await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
            return true;
        }
        return false;
    }
}
export default GameManager