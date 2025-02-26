import GameManager from "./gameManager";

class AiManager {
    private dbCtx: any;
    private gameManager:GameManager;
    constructor(ctx: any,gameManager:GameManager) {
        this.dbCtx = ctx;
        this.gameManager=gameManager;
    }
    async act(){
        
    }
}
export default AiManager;
