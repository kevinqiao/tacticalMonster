import { GameModel } from "../../../../component/ludo/battle/types/CombatTypes";
import { internal } from "../_generated/api";

class GameManager {
    private dbCtx: any;
    private game:GameModel|null; 
    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
    }
    async createGame() {
        const players = await this.dbCtx.runQuery(internal.dao.gamePlayerDao.findAll);
        if(players.length<2) return;
        // console.log("players",players);

        const gameObj:any = { 
            seats: [
            { no: 0, tokens: [] },
            { no: 2, tokens: []},
            {
                no: 1,
                uid: players[0].uid, tokens: [
                    { id: 0, x: 8, y: 4 },
                    { id: 1, x: -1, y: -1 },
                    { id: 2, x: -1, y: -1 },
                    { id: 3, x: -1, y: -1 },
                ],
            },
            {
                no: 3,
                uid: players[1].uid, tokens: [
                    { id: 0, x: -1, y: -1 },
                    { id: 1, x: 6, y: 10 },
                    { id: 2, x: -1, y: -1 },
                    { id: 3, x: -1, y: -1 },
                ],
            }],
        };
        const gameId = await this.dbCtx.runMutation(internal.dao.gameDao.create, gameObj);
        // for(const player of players){                    
        //     const event = { uid: player.uid, name: "GameCreated", data: { gameId } };
        //     await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        // }
        if(gameId){
            gameObj.gameId=gameId;
            this.game=gameObj;
            await this.gameStart();
        }
    }
    getGame(){
        return this.game;
    }
     async gameStart() {
        if(!this.game) return;
        //游戏开始前的处理 , 比如添加buff ，被动技能的执行
        // const gameStartResult={};
        // const gameEvent={gameId:this.game?.gameId,name:"gameStart",data:{gameId:this.game?.gameId,result:gameStartResult}};
        // await this.dbCtx.runMutation(internal.dao.gameEventDao.create, gameEvent);

        // await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
       
    }
    async selectSkill(gameId: string, data: { skillId: string } ): Promise<boolean> {
        console.log("attack", gameId, data);

        return true;    
    } 
    async roll(gameId: string, data: { attacker: { uid: string, character_id: string, skillSelect: string }, target: { uid: string, character_id: string } }): Promise<boolean> {
        console.log("attack", gameId, data);
        return true;
     
    }   
    async selectToken(gameId: string, uid: string, token:number): Promise<boolean> {
      
        return true;
     
    }
    
    async turnStart(){
       
        if(!this.game) return;
        // console.log("turnStart",this.game.currentRound);
      
            // const turnEvent={gameId:this.game.gameId,name:"turnStart",data};
            // await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);  
            // nextTurn.status=1;  
            // await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});

            // await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
              
    }  
    
   
   
}
export default GameManager