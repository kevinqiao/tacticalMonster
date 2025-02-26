import { ACTION_TYPE, GameModel, Seat } from "../../../../component/ludo/battle/types/CombatTypes";
import { getRoutePath } from "../../../../component/ludo/util/mapUtils";
import { internal } from "../_generated/api";
import AiManager from "./aiManager";
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
    private aiManager:AiManager;
    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
        this.aiManager=new AiManager(ctx,this); 
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
            currentSeat:1,  
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
        const seat:Seat|undefined = this.game.seats.find(seat=>seat.uid===uid);
        if(!seat) return false;
        if(!seat.botOn)
        {    
            const event={gameId:this.game.gameId,name:"rollStart",actor:uid,data:{seatNo:seat.no}};
            await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event); 
        }       
         const value =  Math.floor(Math.random() * 6) + 1;
        // const value=6;
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
        console.log("askSelect",tokens);       
        if(!this.game||this.game.currentSeat<0) return;
        const seat = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat) return;
        const tokenIds = tokens.map(t=>t.id);
        this.game.currentAction={type:ACTION_TYPE.SELECT,tokens:tokenIds};
        this.game.actDue=Date.now()+15000;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{currentAction:this.game.currentAction,actDue:this.game.actDue}});
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration:15000}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        this.aiManager.takeAction();
    }
    async askRoll(seatNo:number){

        if(!this.game) return 
        const seat=this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        this.game.currentAction={type:ACTION_TYPE.ROLL};        
        this.game.actDue=Date.now()+15000;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{actDue:this.game.actDue,currentAction:this.game.currentAction}});
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration:15000}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        this.aiManager.takeAction();
    }
    async selectToken(uid:string,tokenId:number){
        if(!this.game) return;
        const seat = this.game.seats.find(seat=>seat.uid===uid);
        if(!seat||!seat.dice) return;
        const token=seat.tokens.find(t=>t.id===tokenId);
        if(!token) return;
        const event:any={gameId:this.game.gameId,name:"tokenSelected",actor:seat.uid,data:{seatNo:seat.no,tokenId}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
        console.log("selectToken",token)
       if(token.x<0||token.y<0){
            await this.releaseToken(seat,token);
       }else{
            await this.move(seat,token,seat.dice);
       }        
    }
    async releaseToken(seat:any,token:any){
        if(!this.game) return;  
        const route=routes[seat.no];
        const startPoint = route[0];
        console.log("releaseToken startPoint",startPoint)
        token.x=startPoint.x;
        token.y=startPoint.y;
        await this.dbCtx.runMutation(internal.dao.gameDao.update, {id:this.game.gameId,data:{seats:this.game.seats}});
        const event:any={gameId:this.game.gameId,name:"tokenReleased",actor:"####",data:{seat:seat.no,token}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event); 
        await this.askRoll(seat.no);

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
                if(this.gameOver()){
                    console.log("gameOver");
                    return;
                }
                if(end.x===route[route.length-1].x && end.y===route[route.length-1].y){
                  await  this.askRoll(seat.no);
                }else{
                  await this.turnNext();
                }   
            }
    }
    gameOver(){
        if(!this.game) return;
        const attendSeats = this.game?.seats.filter((seat)=>seat.uid);
        const completedSeats = this.game?.seats.filter((seat)=>{
            if(!seat.uid) return false;
            const route=routes[seat.no];
            const finalPoint = route[route.length-1];
            return seat.tokens.every((token)=>{
                if(token.x===finalPoint.x&&token.y===finalPoint.y)
                    return true;
                else return false
            })            
        })
        if(attendSeats.length-completedSeats.length===1)
             return true;
        else return false;  
    }
    async turnNext(){    
        console.log("turnNext",this.game?.currentSeat);
        if(!this.game||this.game.currentSeat<0) return;
        const seatNo = this.game.currentSeat;
        const actives = this.game.seats.filter((s)=>s.uid);
        const cur = actives.findIndex((s)=>s.no===seatNo);
        const nextSeat = cur===(actives.length-1)?actives[0]:actives[cur+1]               
        this.game.currentSeat=nextSeat.no;
        const event:any={gameId:this.game.gameId,name:"turnNext",actor:"####",data:{seatNo:nextSeat.no}};
        await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event); 
        await this.askRoll(nextSeat.no);
    }  
    async timeout(){
       
        const game=await this.dbCtx.runMutation(internal.dao.gameDao.lock, {id:this.game?.gameId});
        if(game?.actDue&&game.actDue<Date.now()){
            const seat = game.seats.find((seat:any)=>seat.no===game.currentAction.seat);
            if(seat){
                seat.botOn=true;    
                const event:any={gameId:this.game?.gameId,name:"botOn",actor:"####",data:{seat:seat.no}};
                await this.dbCtx.runMutation(internal.dao.gameEventDao.create, event);
                this.aiManager.takeAction();
            }
        }
        await this.dbCtx.runMutation(internal.dao.gameDao.unlock, {id:this.game?.gameId});
    }
    async botAct(){
        console.log("botAct");  
        const bots = await this.dbCtx.runQuery(internal.dao.botDao.findDue);
        console.log("bots",bots);
    }
   
   
}
export default GameManager