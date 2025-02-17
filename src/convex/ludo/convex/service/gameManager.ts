import { GameModel } from "../../../../component/ludo/battle/types/CombatTypes";
import { getRoutePath } from "../../../../component/ludo/util/mapUtils";
import { internal } from "../_generated/api";
import { tokenRoutes } from "./tokenRoutes";
const routes: { [k: number]: { x: number, y: number }[] } = {};
[0,1,2,3].forEach((seatNo) => {
      const path = tokenRoutes[seatNo];
      if (path) {
        const route = getRoutePath(path);
        routes[seatNo] = route;
      }
});
class GameManager {
    private dbCtx: any;
    private game:GameModel|null; 
    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
      
    }
    async initGame(gameId:string){
        console.log("initGame",gameId);
        const game=await this.dbCtx.runQuery(internal.dao.gameDao.get, {gameId});
        this.game=game;
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
                    { id: 1, x: 8, y: 4 },
                    { id: 0, x: -1, y: -1 },
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
    async roll(uid:string): Promise<boolean> {
        if(!this.game) return false;
        const seat = this.game.seats.find(seat=>seat.uid===uid);
        if(!seat) return false;
        const event={gameId:this.game.gameId,name:"rollStart",actor:uid,data:{seatNo:seat.no}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event); 
        const route=routes[seat.no];
        // console.log("route",route); 
        const token = seat.tokens.find((t)=>t.id===1);  
        if(!token) return false;
        const startIndex = route.findIndex((t)=>t.x===token?.x && t.y===token?.y);
        const value =  Math.floor(Math.random() * 6) + 1
        const path = route.slice(startIndex, startIndex + value > route.length ? route.length : startIndex + value);
        console.log("path",path);
        const end = path[path.length-1];
        token.x=end.x;
        token.y=end.y;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{seats:this.game.seats}});
        const eventDone={gameId:this.game.gameId,name:"rollDone",actor:"####",data:{seat:seat.no,tokenId:token.id,route:path,value}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, eventDone);  
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