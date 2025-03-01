import { ACTION_TYPE, GameModel, Seat } from "../../../../component/ludo/battle/types/CombatTypes";
import { getRoutePath } from "../../../../component/ludo/util/mapUtils";
import { Id } from "../_generated/dataModel";
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
    private aiBots:{[k:number]:any};

    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
        this.aiBots={};
    }
    async initGame(gameId:string){
        const id = gameId as Id<"game">;
        const game = await this.dbCtx.db.get(id);      
        if(game){
            if(game.actDue){
                game.actDue=game.actDue-Date.now();
            }
            this.game={...game,_id:undefined,_creationTime:undefined,gameId};
            game.seats.filter((seat:any)=>seat.uid).forEach(async (seat:any)=>{
                const bot = await this.dbCtx.db.get(seat.uid as Id<"bot">);
                if(bot){
                    this.aiBots[seat.no]=bot;
                }   
            })
        } 
    }
    async createGame() {
        // const players = await this.dbCtx.runQuery(internal.dao.gamePlayerDao.findAll);
        const players = await this.dbCtx.db.query("game_player").collect()
        if(players.length<2) return;

        const gameObj:any = { 
            currentSeat:-1,  
            currentAction:{type:ACTION_TYPE.ROLL},
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
        const gameId =  await this.dbCtx.db.insert("game",gameObj);
        // const gameId = await this.dbCtx.runMutation(internal.dao.gameDao.create, gameObj);
       
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
        await this.turnNext();
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
    async roll(): Promise<boolean> {
        if(!this.game) return false;

        const seat:Seat|undefined = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat) return false;
        if(!seat.botOn)
        {    
            const event={gameId:this.game.gameId,name:"rollStart",actor:seat.uid,data:{seatNo:seat.no}};
            await this.dbCtx.db.insert("game_event",event);  
        }       
         const value =  Math.floor(Math.random() * 6) + 1;
        // const value=6;
        const availableTokens = this.getAvailableTokens(value,seat);
        const eventDone:any={gameId:this.game.gameId,name:"rollDone",actor:"####",data:{seatNo:seat.no,value}};
        await this.dbCtx.db.insert("game_event",eventDone);            
        // await this.dbCtx.runMutation(internal.dao.gameEventDao.create, eventDone);
        seat.dice=value;
        await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{seats:this.game.seats}});  
     
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
        const duration = seat.botOn?0:15000;
        this.game.currentAction={type:ACTION_TYPE.SELECT,tokens:tokenIds};
        this.game.actDue=Date.now()+duration;
        await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{currentAction:this.game.currentAction,actDue:this.game.actDue}});
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration}};
        await this.dbCtx.db.insert("game_event",event);
    
    }
    async askRoll(seatNo:number){

        if(!this.game) return 
        const seat=this.game.seats.find(seat=>seat.no===seatNo);
        if(!seat) return;
        const duration = seat.botOn?0:15000;
        this.game.currentAction={type:ACTION_TYPE.ROLL};        
        this.game.actDue=Date.now()+duration;
        await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{actDue:this.game.actDue,currentAction:this.game.currentAction}});
        const event:any={gameId:this.game.gameId,name:"askAct",actor:"####",data:{...this.game.currentAction,duration}};
        await this.dbCtx.db.insert("game_event",event);
        
        
        
    }
    async selectToken(tokenId:number){
        if(!this.game) return;
        const seat:Seat|undefined = this.game.seats.find(seat=>seat.no===this.game?.currentSeat);
        if(!seat||!seat.dice) return;
        const token=seat.tokens.find(t=>t.id===tokenId);
        if(!token) return;
        const event:any={gameId:this.game.gameId,name:"tokenSelected",actor:seat.uid,data:{seatNo:seat.no,tokenId}};
        await this.dbCtx.db.insert("game_event",event);
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
        await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{seats:this.game.seats}});
        const event:any={gameId:this.game.gameId,name:"tokenReleased",actor:"####",data:{seat:seat.no,token}};
        await this.dbCtx.db.insert("game_event",event); 
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
                await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{seats:this.game.seats}});
                const event:any={gameId:this.game.gameId,name:"move",actor:"####",data:{seat:seat.no,token:token.id,route:path}};
                await this.dbCtx.db.insert("game_event",event); 
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
        if(!this.game) return;
        const actives = this.game.seats.filter((s)=>s.uid).sort((a,b)=>a.no-b.no);
        if(this.game.currentSeat<0){
            this.game.currentSeat=actives[0].no;
        }else{
            const cur = actives.findIndex((s)=>s.no===this.game?.currentSeat);
            const nextSeat = cur===(actives.length-1)?actives[0]:actives[cur+1]               
            this.game.currentSeat=nextSeat.no;
        }
        await this.dbCtx.db.insert("game",{id:this.game.gameId,data:{currentSeat:this.game.currentSeat}});
        const event:any={gameId:this.game.gameId,name:"turnNext",actor:"####",data:{seatNo:this.game.currentSeat}};
        await this.dbCtx.db.insert("game_event",event); 
        await this.askRoll(this.game.currentSeat);
    }  
    async timeout(){
   
       if(this.game){
            if(this.game?.actDue&&this.game.actDue<=0){
                const currentSeat = this.game.currentSeat;
                const seat = this.game.seats.find((seat:any)=>seat.no===currentSeat);
                console.log("seat act due:",seat);
                if(seat){
                    seat.botOn=true;    
                    const event:any={gameId:this.game?.gameId,name:"botOn",actor:"####",data:{seat:seat.no}};
                    await this.dbCtx.db.insert("game_event",event);             
                }
            }
        }
       
    }

   
   
}
export default GameManager