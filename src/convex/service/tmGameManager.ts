import { internal } from "../_generated/api";
import { Attributes, Stats } from "../model/CharacterModels";
import { calculateStats } from "../utils/Utlis";

class GameManager {
    private dbCtx: any;
    constructor(ctx: any) {
        this.dbCtx = ctx;
    }
    async createGame() {
        const players = await this.dbCtx.runQuery(internal.dao.tmPlayerDao.findAll);
        // console.log(players)
        if (players) {
            const map = await this.dbCtx.runQuery(internal.dao.tmMapDataDao.find, { mapId: "1" });
            const game = { challenger: "1", challengee: "2", map, round: 0, turns: [{ uid: "1", character_id: "mage_1", status: 0 }, { uid: "2", character_id: "warrior_1", status: 0 }], timeClock: 30 }
            const gameId = await this.dbCtx.runMutation(internal.dao.tmGameDao.create, game);
            for (const player of players) {
                const characters = await this.dbCtx.runQuery(internal.dao.tmPlayerCharacterDao.findAll, { uid: player.uid });

                const gameCharacters: any[] = [];
                for (const character of characters) {
                    const { character_id, level } = character;
                    const characterData = await this.dbCtx.runQuery(internal.dao.tmCharacterDataDao.find, { character_id });
                    if (characterData) {
                        const levelData = await this.dbCtx.runQuery(internal.dao.tmLevelDataDao.findByLevel, { character_id, level });
                        if (levelData?.attributes) {
                            const attributes = levelData.attributes as Attributes
                            const stats: Stats = calculateStats(attributes);
                            const { move_range, attack_range } = characterData;
                            gameCharacters.push({ ...character, move_range, attack_range, stats, gameId, _id: undefined, _creationTime: undefined, asset: undefined })
                        }
                    }
                }
                for (const gameCharacter of gameCharacters) {
                    await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.create, gameCharacter)
                }
                const event = { uid: player.uid, name: "GameCreated", data: { gameId } }
                await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event)
            }
        }
    }
}
export default GameManager