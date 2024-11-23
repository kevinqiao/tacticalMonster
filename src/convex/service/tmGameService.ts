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
                            gameCharacters.push({ ...character, move_range, attack_range, stats, gameId: "1", _id: undefined, _creationTime: undefined, asset: undefined })
                        }
                    }
                }
                for (const gameCharacter of gameCharacters) {
                    await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.create, gameCharacter)
                }

            }
        }
    }
}
export default GameManager