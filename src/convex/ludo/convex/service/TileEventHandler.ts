import { getRoutePath } from "../../../../component/ludo/util/mapUtils";
import GameManager from "./gameManager";
import { tokenRoutes } from "./tokenRoutes";
const routes: { [k: number]: { x: number, y: number }[] } = {};
[0,1,2,3].forEach((seatNo) => {
      const path = tokenRoutes[seatNo];
      if (path) {
        const route = getRoutePath(path);
        routes[seatNo] = route;
      }
});
export type Tile={
    x:number;
    y:number;
    type:number;
    active?:number;
    use?:number;
}
class TileEventHandler {    
    private gameManager:GameManager;

    constructor(gameManager:GameManager) {
        this.gameManager=gameManager;        
    }

    async onMove({seatNo,token,path}:{seatNo:number,token:number,path:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
        const stopTile = path[path.length-1];   
        const tile:Tile|undefined   = game.tiles?.find(t=>t.x===stopTile.x && t.y===stopTile.y);
        if(!tile) return;
        switch(tile.type){
            case 0:
                this.processAttack({seatNo:seatNo,token:token,tile});
                break;
            case 1:
                this.processTeleport({seatNo:seatNo,token:token,route:path,tile});
                break;
            case 2:
                this.processSwap({seatNo:seatNo,token:token,route:path});
                break;
            case 3:
                this.processEnergyPoint({seatNo:seatNo,token:token,route:path});
                break;
            case 4:
                this.processBlockZone({seatNo:seatNo,token:token,route:path});
                break;
        }

        
    }
    async processAttack({seatNo,token,tile}:{seatNo:number,token:number,tile:Tile}){
        const game=this.gameManager.getGame();
        if(!game) return;  
         let eventId =null;
        game.seats.filter((s)=>s.no!==seatNo).forEach((seat)=>{
            seat.tokens.forEach(async(t)=>{
              if(t.x===tile.x&&t.y===tile.y){
                t.x=-1;
                t.y=-1;               
                const event={gameId:game.gameId,name:"attacked",actor:"####",data:{seatNo:seat.no,tokenId:t.id}};
                eventId = await this.gameManager.dbCtx.db.insert("game_event",event);
                console.log("processAttack",game.gameId,eventId)   
                await this.gameManager.dbCtx.db.patch(game.gameId,{seats:game.seats,lastUpdate:eventId});
              }
            })
        })  
    
    }   
 
    async processTeleport({seatNo,token,route,tile}:{seatNo:number,token:number,route:{x:number,y:number}[],tile:Tile}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    }   
 
     async processSwap({seatNo,token,route}:{seatNo:number,token:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processEnergyPoint({seatNo,token,route}:{seatNo:number,token:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processBlockZone({seatNo,token,route}:{seatNo:number,token:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processHazardZone({seatNo,token,route}:{seatNo:number,token:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processBoosterZone({seatNo,token,route}:{seatNo:number,token:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
   
}
export default TileEventHandler