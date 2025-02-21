import { ACTION_TYPE, GameModel } from "../../../../component/ludo/battle/types/CombatTypes";
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
            currentAction:{type:ACTION_TYPE.ROLL,seat:1},
            actDue:Date.now()+15000,    
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
    getAvailableTokens(dice:number,seat:any){
        const route=routes[seat.no];
        if(dice===6){
            return seat.tokens.filter((t:any)=>{
                if(t.x<0||t.y<0) return true;
                const startIndex = route.findIndex((r:any)=>r.x===t.x && r.y===t.y);
                const endIndex = startIndex + dice+1;
                return endIndex < route.length;
            })
        }else{
            return seat.tokens.filter((t:any)=>{
                if(t.x<0||t.y<0) return false;
                const startIndex = route.findIndex((r:any)=>r.x===t.x && r.y===t.y);
                const endIndex = startIndex + dice+1;
                return endIndex < route.length;
            });
        }
    }
    async roll(uid:string): Promise<boolean> {
        if(!this.game) return false;
        const seat = this.game.seats.find(seat=>seat.uid===uid);
        if(!seat) return false;
        const event={gameId:this.game.gameId,name:"rollStart",actor:uid,data:{seatNo:seat.no}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);        
        const value =  Math.floor(Math.random() * 6) + 1;
        const availableTokens = this.getAvailableTokens(value,seat);
        const eventDone:any={gameId:this.game.gameId,name:"rollDone",actor:"####",data:{seatNo:seat.no,value}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, eventDone);
        seat.dice=value;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{seats:this.game.seats}});  
        if(availableTokens.length===0){              
         await this.turnNext()
        }else if(availableTokens.length===1){           
         await   this.move(seat,availableTokens[0],value);  
        }else{
         await   this.askSelect(availableTokens);    
        }      
        return true;
     
    }   
    async askSelect(tokens:any[]){
        const seatNo = this.game?.currentAction?.seat;
        if(!seatNo||!this.game) return;
        const seat = this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        this.game.currentAction={seat:seatNo,type:ACTION_TYPE.SELECT,tokens};
        this.game.actDue=Date.now()+15000;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{currentAction:this.game.currentAction,actDue:this.game.actDue}});
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration:15000}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
    }
    async askAct(){
        
        const seatNo = this.game?.currentAction?.seat;
        if(!seatNo||!this.game) return;
        const seat=this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        const route=routes[seat.no];
        const finalPoint = route[route.length-1];
        const gameOver = seat.tokens.every((t:any)=>t.x===finalPoint.x && t.y===finalPoint.y);
        if(gameOver){
            this.gameOver();
        }else{  
            this.game.currentAction={seat:seatNo,type:ACTION_TYPE.ROLL};        
            this.game.actDue=Date.now()+15000;
            await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{actDue:this.game.actDue,currentAction:this.game.currentAction}});
            const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration:15000}};
            await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        }

    }
    async selectToken(seatNo:number,tokenId:number){
        if(!this.game) return;
        const seat=this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        const dice=seat.dice;
        if(!dice) return;
        const token=seat.tokens.find(t=>t.id===tokenId);
        if(!token) return;
        const event:any={gameId:this.game.gameId,name:"selectToken",actor:seat.uid,data:{seatNo:seat.no,tokenId:token.id}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        await this.move(seat,token,dice); 
        
    }
    async move(seat:any, token:any,step:number): Promise<void> {
            console.log("move",seat,token,step);    
            if(!this.game) return ;
            const route=routes[seat.no];
            const startIndex = route.findIndex((t)=>t.x===token?.x && t.y===token?.y);
            const path =  startIndex + step < route.length ?route.slice(startIndex+1, startIndex + step+1):[];

            if(path.length>0){
                const end = path[path.length-1];
                token.x=end.x;
                token.y=end.y;
                await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{seats:this.game.seats}});
                const event:any={gameId:this.game.gameId,name:"move",actor:"####",data:{seat:seat.no,token:token.id,route:path}};
                await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);  
                if(end.x===route[route.length-1].x && end.y===route[route.length-1].y){
                  await  this.askAct();
                }else{
                  await this.turnNext();
                }   
            }
    }
    async gameOver(){
        console.log("gameOver");
    }
    async turnNext(){    
        console.log("turnNext",this.game?.currentAction);
        if(!this.game) return;
        const seatNo = this.game.currentAction?.seat;
        if(!seatNo) return;
        let nextSeat;
        while(!nextSeat||nextSeat.tokens.length===0){  
            const no:number = nextSeat ? (nextSeat.no===3?0:nextSeat.no+1):(seatNo===3?0:seatNo+1);
            nextSeat =this.game.seats.find((s)=>s.no===no);
        }

        this.game.currentAction={seat:nextSeat.no,type:ACTION_TYPE.ROLL};
        this.game.actDue=Date.now()+15000;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{currentAction:this.game.currentAction,actDue:this.game.actDue}});
        const event:any={gameId:this.game.gameId,name:"turnNext",actor:"####",data:{...this.game.currentAction,duration:15000}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);       
    }  
    async timeout(){
        console.log("timeout");
        const isLocked=await this.dbCtx.runMutation(internal.dao.gameDao.lock, {id:this.game?.gameId});
        if(isLocked){
            await this.turnNext();  
            await this.dbCtx.runMutation(internal.dao.gameDao.unlock, {id:this.game?.gameId});
        }
    }
   
   
}
export default GameManager