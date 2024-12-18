import { internal } from "../_generated/api";
import { Attributes, Stats } from "../model/CharacterModels";
import { calculateStats } from "../utils/Utlis";

interface Player {
    uid: string;
    name?: string;
    avatar?: string;
}

const getPosition = (game: { challenger: string,challengee:string }, player: Player) => {
    const position = { q: 0, r: 0 };
    if (player.uid === game.challenger) {
        position.q = Math.floor(Math.random() * 2);
        position.r = Math.floor(Math.random() * 6);
    } else {
        position.q = Math.floor(Math.random() * (7 - 6 + 1)) + 6;
        position.r = Math.floor(Math.random() * 6);
    }
    return position;
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
                        const position=getPosition(game,player);

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