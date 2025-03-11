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
    status?:number;//0-open 1-activated 2-triggered 3-closed
}
class TileEventHandler {    
    private gameManager:GameManager;

    constructor(gameManager:GameManager) {
        this.gameManager=gameManager;        
    }

    async onMove({seatNo,tokenId,path}:{seatNo:number,tokenId:number,path:{x:number,y:number}[]}){
        console.log("onMove",seatNo,tokenId,path);
        const game=this.gameManager.getGame();
        if(!game) return;
        const stopPoint = path[path.length-1];   
        const tile:Tile|undefined   = game.tiles?.find(t=>t.x===stopPoint.x && t.y===stopPoint.y);
        if(!tile) return;
        switch(tile.type){
            case 0:
                this.processAttack({seatNo:seatNo,tokenId:tokenId,tile});
                break;
            case 1:
                this.processTeleport({seatNo:seatNo,tokenId:tokenId,tile});
                break;
            case 2:
                this.processSwap({seatNo:seatNo,tokenId:tokenId,route:path});
                break;
            case 3:
                this.processEnergyPoint({seatNo:seatNo,tokenId:tokenId,route:path});
                break;
            case 4:
                this.processBlockZone({seatNo:seatNo,tokenId:tokenId,route:path});
                break;
        }

        
    }
    async processAttack({seatNo,tokenId,tile}:{seatNo:number,tokenId:number,tile:Tile}){
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
                await this.gameManager.dbCtx.db.patch(game.gameId,{seats:game.seats,lastUpdate:eventId});
              }
            })
        })  
    
    }   
 
    async processTeleport({seatNo,tokenId,tile}:{seatNo:number,tokenId:number,tile:Tile}){
        console.log("processTeleport",seatNo,tokenId,tile);
        const game=this.gameManager.getGame();
        const seat=game?.seats.find((s)=>s.no===seatNo);
        console.log("game",seat);
        const token = seat?.tokens.find((t)=>t.id===tokenId);
        console.log("token",token);
         if(!game||!game.tiles||!token) return;
        const targetTiles = game.tiles.filter((t)=>t.type>0&&(t.x!==tile.x||t.y!==tile.y));
        console.log("targetTiles",targetTiles);
        if(targetTiles.length===0) return;
        const targetTile = targetTiles[Math.floor(Math.random()*targetTiles.length)];
        const event={gameId:game.gameId,name:"teleported",actor:"####",data:{seatNo:seatNo,tokenId:token.id,tile:tile,targetTile:targetTile}};
        const eventId = await this.gameManager.dbCtx.db.insert("game_event",event);
        tile.status=2;
        token.x=targetTile.x;
        token.y=targetTile.y;
        await this.gameManager.dbCtx.db.patch(game.gameId,{seats:game.seats,tiles:game.tiles,lastUpdate:eventId});

    }   
 
     async processSwap({seatNo,tokenId,route}:{seatNo:number,tokenId:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processEnergyPoint({seatNo,tokenId,route}:{seatNo:number,tokenId:number,route:{x:number,y:number}[]}){
        const game=this.gameManager.getGame();
        if(!game) return;
      
    
    } 
    async processBlockZone({seatNo,tokenId,route}:{seatNo:number,tokenId:number,route:{x:number,y:number}[]}){
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