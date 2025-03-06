import { ACTION_TYPE, GameModel, Seat } from "../../../../component/ludo/battle/types/CombatTypes";
import { getRoutePath } from "../../../../component/ludo/util/mapUtils";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { gameObj } from "./gameData";
import TileEventHandler from "./TileEventHandler";
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
    public dbCtx: any;
    private game:GameModel|null; 
    private aiBots:{[k:number]:any};
    private tileEventHandler:TileEventHandler;

    constructor(ctx: any,game?:GameModel) {
        this.dbCtx = ctx;
        this.game=game??null;
        this.aiBots={};
        this.tileEventHandler=new TileEventHandler(this);
    }
    async initGame(gameId:string){
        try{
            const id = gameId as Id<"game">;
            const game = await this.dbCtx.db.get(id);      

            if(game){
                game.seats.forEach((seat: any) => {
                    seat.tokens.forEach((token: any) => {
                        token.seatNo = seat.no;
                    })
               })
                if(game.actDue){
                    game.actDue=game.actDue-Date.now();
                }
                this.game={...game,_id:undefined,_creationTime:undefined,gameId:id};
                game.seats.filter((seat:any)=>seat.uid).forEach(async (seat:any)=>{
                    const bot = await this.dbCtx.db.query("bot").withIndex("by_uid",(q:any)=>q.eq("uid",seat.uid)).unique();
                    if(bot){
                        this.aiBots[seat.no]=bot;
                    }   
                })
                
            } 
        }catch(error){
            console.log("initGame error",error);
        }
    }
    async createGame() {
        // const players = await this.dbCtx.runQuery(internal.dao.gamePlayerDao.findAll);
        const players = await this.dbCtx.db.query("game_player").collect()
        if(players.length<2) return;
        const seat1 = gameObj.seats.find((s:any)=>s.no===1);
        seat1.uid=players[0].uid;
        const seat3 = gameObj.seats.find((s:any)=>s.no===3);
        seat3.uid=players[1].uid;
        const gameId =  await this.dbCtx.db.insert("game",gameObj);
        // // const gameId = await this.dbCtx.runMutation(internal.dao.gameDao.create, gameObj);
        console.log("gameId",gameId);
        if(gameId){
            gameObj.gameId=gameId;
            gameObj.seats.forEach((seat: any) => {
                seat.tokens.forEach((token: any) => {
                    token.seatNo = seat.no;
                })
            })
            this.game=gameObj;
        }
    }
    getGame(){
        return this.game;
    }
    
     async start() {
        if(!this.game||this.game.status!==-1) return;
        console.log("start game",this.game.gameId); 
        this.game.status=0;
        const event:any={gameId:this.game.gameId,name:"gameStarted",actor:"####",data:{status:0}};
        const eventId = await this.dbCtx.db.insert("game_event",event); 
        await this.dbCtx.db.patch(this.game.gameId, {lastUpdate:eventId,status:0});
        await this.turnNext();
      
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
    async roll(): Promise<boolean> {
        if(!this.game) return false;

        const seat:Seat|undefined = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat) return false;

        if(!seat.botOn)
        {    
            const event={gameId:this.game.gameId,name:"rollStart",actor:seat.uid,data:{seatNo:seat.no}};
            await this.dbCtx.db.insert("game_event",event);  
        }       
        // const value =  Math.floor(Math.random() * 6) + 1;
        const value=6;
        const availableTokens = this.getAvailableTokens(value,seat);
        const eventDone:any={gameId:this.game.gameId,name:"rollDone",actor:"####",data:{seatNo:seat.no,value}};
        const eventId = await this.dbCtx.db.insert("game_event",eventDone);            
        // await this.dbCtx.runMutation(internal.dao.gameEventDao.create, eventDone);
        seat.dice=value;
        await this.dbCtx.db.patch(this.game.gameId,{seats:this.game.seats,lastUpdate:eventId});  
        // console.log("roll",seat,value,availableTokens.length);
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
        // console.log("askSelect",tokens);       
        if(!this.game||this.game.currentSeat<0) return;
        const seat = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat) return;
        const tokenIds = tokens.map(t=>t.id);
        const duration = seat.botOn?3000:15000;
        this.game.currentAction={type:ACTION_TYPE.SELECT,tokens:tokenIds};
        this.game.actDue=Date.now()+duration;
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,seat:seat.no,duration}};
        const eventId = await this.dbCtx.db.insert("game_event",event);
         await this.dbCtx.db.patch(this.game.gameId,{currentAction:this.game.currentAction,actDue:this.game.actDue,lastUpdate:eventId});
       
    
    }
    async askRoll(seatNo:number){

        if(!this.game) return 
        const seat=this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        const duration = seat.botOn?3000:15000;
        this.game.currentAction={type:ACTION_TYPE.ROLL};        
        this.game.actDue=Date.now()+duration;
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration}};
        const eventId = await this.dbCtx.db.insert("game_event",event);
        await this.dbCtx.db.patch(this.game.gameId,{actDue:this.game.actDue,currentAction:this.game.currentAction,lastUpdate:eventId});
        
        
    }
    async selectToken(actor:string,tokenId:number){
        if(!this.game) return;
        const seat:Seat|undefined = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat||!seat.dice) return;
        const token=seat.tokens.find(t=>t.id===tokenId);
        if(!token) return;
        const event:any={gameId:this.game.gameId,name:"tokenSelected",actor,data:{seatNo:seat.no,tokenId}};
        const eventId = await this.dbCtx.db.insert("game_event",event);
        await this.dbCtx.db.patch(this.game.gameId,{seats:this.game.seats,lastUpdate:eventId});
        // console.log("selectToken",token)
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
        const event:any={gameId:this.game.gameId,name:"tokenReleased",actor:"####",data:{seat:seat.no,token}};
        const eventId = await this.dbCtx.db.insert("game_event",event); 
        await this.dbCtx.db.patch(this.game.gameId,{seats:this.game.seats,lastUpdate:eventId});
        await this.askRoll(seat.no);

    }
    async move(seat:any, token:any,step:number): Promise<void> {
            // console.log("move",seat,token,step);    
            if(!this.game) return ;
            const route=routes[seat.no];
            const startIndex = route.findIndex((t)=>t.x===token?.x && t.y===token?.y);
            const path =  startIndex + step < route.length ?route.slice(startIndex+1, startIndex + step+1):[];

            if(path.length>0){
                const end = path[path.length-1];
                token.x=end.x;
                token.y=end.y;
               
                const event:any={gameId:this.game.gameId,name:"move",actor:"####",data:{seat:seat.no,token:token.id,route:path}};
                const eventId = await this.dbCtx.db.insert("game_event",event); 
                await this.dbCtx.db.patch(this.game.gameId,{seats:this.game.seats,lastUpdate:eventId});
                await this.tileEventHandler.onMove({seatNo:seat.no,token:token.id,path});
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
       
        if(!this.game) return;
        const actives = this.game.seats.filter((s)=>s.uid).sort((a,b)=>a.no-b.no);
        if(!this.game.currentSeat){
            this.game.currentSeat=actives[0].no;
        }else{
            const cur = actives.findIndex((s)=>s.no===this.game?.currentSeat);
            const nextSeat = cur===(actives.length-1)?actives[0]:actives[cur+1]               
            this.game.currentSeat=nextSeat.no;
        }
        console.log("turnNext gameId:",this.game?.gameId);
        const event:any={gameId:this.game.gameId,name:"turnNext",actor:"####",data:{seatNo:this.game.currentSeat}};
        const eventId = await this.dbCtx.db.insert("game_event",event); 
        await this.dbCtx.db.patch(this.game.gameId, {currentSeat:this.game.currentSeat,lastUpdate:eventId,status:this.game.status});
        await this.askRoll(this.game.currentSeat);
     
    }  
    async timeout(){
   
       if(this.game){
            if(this.game?.actDue&&this.game.actDue<=0){
                const currentSeat = this.game.currentSeat;
                const seat = this.game.seats.find((seat:any)=>seat.no===currentSeat);
                // console.log("seat act due:",seat,this.game.currentAction);
                if(seat){
                    if(!seat.botOn){        
                        seat.botOn=true;    
                        const event:any={gameId:this.game?.gameId,name:"botOn",actor:"####",data:{seat:seat.no}};
                        const eventId =  await this.dbCtx.db.insert("game_event",event); 
                        await this.dbCtx.db.patch(this.game.gameId,{seats:this.game.seats,lastUpdate:eventId});
                    }
                    if(this.game?.currentAction?.type===ACTION_TYPE.ROLL){    
                        console.log("timeout roll,gameId:",this.game?.gameId);
                        await this.roll();
                    }else if(this.game?.currentAction?.type===ACTION_TYPE.SELECT){
                        console.log("timeout select,gameId:",this.game?.gameId);
                        await this.dbCtx.scheduler.runAfter(0,internal.service.aiAgent.takeSelect,{gameId:this.game?.gameId});            
                    }
                }
            }
        }
       
    }
    async turnOffBot(seat:Seat){    
        if(!this.game) return;
        seat.botOn=false;   
        const event:any={gameId:this.game.gameId,name:"botOff",actor:"####",data:{seat:seat.no}};
        const eventId = await this.dbCtx.db.insert("game_event",event); 
        await this.dbCtx.db.patch(this.game.gameId, {lastUpdate:eventId,seats:this.game.seats});
     
    }  
   
   
}
export default GameManager