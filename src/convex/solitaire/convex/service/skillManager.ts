import { GameModel } from "../../../../component/solitaire/battle/types/CombatTypes";
import { Skill } from "../../../../component/solitaire/battle/types/PlayerTypes";
import { Id } from "../_generated/dataModel";

interface Card {
    id: string;
    suit: string;
    rank: string;
    seat?: number;
    field?: number;
    col?: number;
    row?: number;
    status?: number;
}

class SkillManager {
    public dbCtx: any;
    public skills: Skill[] = [];
    public game: GameModel | null = null;


    constructor(ctx: any) {
        this.dbCtx = ctx;
    }
    async init(gameId: string) {
        try {
            const id = gameId as Id<"game">;
            const game = await this.dbCtx.db.get(id);

            if (game) {
                this.game = { ...game, _id: undefined, _creationTime: undefined, gameId: id };
            }
        } catch (error) {
            console.log("initGame error", error);
        }
    }

    async triggerSkill(uid: string, skillId: string) {
        if (!this.game) return;

    }





}
export default SkillManager