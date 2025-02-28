import { ACTION_TYPE } from "../../../../component/ludo/battle/types/CombatTypes";
import GameManager from "./gameManager";

class AiManager {
    private dbCtx: any;
    private gameManager:GameManager;
    constructor(ctx: any,gameManager:GameManager) {
        this.dbCtx = ctx;
        this.gameManager=gameManager;
    }
    async takeAction(){
        const game = this.gameManager.getGame();
        console.log("takeAction",game);
        if(!game) return;
        const seat = game.seats.find((seat:any)=>seat.no===game.currentSeat);
        if(!seat||!seat.uid) return;
        const currentAction = game.currentAction;
        if(seat.botOn&&currentAction){
            if(currentAction.type===ACTION_TYPE.ROLL){
                console.log("AI roll",seat.uid);
                await this.gameManager.roll(seat.uid);
            }else if(currentAction.type===ACTION_TYPE.SELECT&&currentAction.tokens){
                console.log("AI select",seat.uid);
                await this.gameManager.selectToken(seat.uid,currentAction.tokens[0]);
            }
        }
    }
}
export default AiManager;
