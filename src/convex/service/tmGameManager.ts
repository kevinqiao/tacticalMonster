import { MapModel } from "../../component/kumu/battle/model/CombatModels";
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
                const gameUpdated={id:gameId,data:{round:round.no}};
                await this.dbCtx.runMutation(internal.dao.tmGameDao.update,gameUpdated);   
                for(const player of players){                    
                    const event = { uid: player.uid, name: "GameCreated", data: { gameId } };
                    await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
                }
                // const gameEvent={gameId,name:"roundStart",data:null};
                // await this.dbCtx.runMutation(internal.dao.tmEventDao.create, gameEvent);
            }
        }
    }
}
export default GameManager