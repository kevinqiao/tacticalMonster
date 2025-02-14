import { SkillManager } from "../../../../component/kumu/battle/service/SkillManager";
import { Skill } from "../../../../component/kumu/battle/types/CharacterTypes";
import { CombatEvent, CombatTurn, GameModel } from "../../../../component/kumu/battle/types/CombatTypes";

class GameManager {
    private dbCtx: any;
    private game:GameModel|null; 
    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
    }
    getGame(){
        return this.game;
    }
   
    async selectSkill(gameId: string, data: { skillId: string } ): Promise<boolean> {
        console.log("attack", gameId, data);

        return true;    
    } 
    async roll(gameId: string, data: { attacker: { uid: string, character_id: string, skillSelect: string }, target: { uid: string, character_id: string } }): Promise<CombatEvent|null> {
        console.log("attack", gameId, data);
        return null;
     
    }   
    async selectToken(gameId: string, uid: string, token:number): Promise<boolean> {
      
        return true;
     
    }
    
    async turnStart(){
       
        if(!this.game||!this.game.currentRound) return;
        // console.log("turnStart",this.game.currentRound);
        const round = this.game.currentRound;
        const nextTurn = round.turns?.find((turn:CombatTurn)=>turn.status===0);
        if(nextTurn){
            const data:CombatTurn= {...nextTurn};
            const character = this.game.characters.find(c=>c.character_id===nextTurn.character_id);
            if(character){              
                const skillService = new SkillManager(character,this.game);                 
                const skills = await skillService.getAvailableSkills();
                // console.log("game turn start    skills",skills)
                if(skills){
                    data.skills=skills.map((skill:Skill)=>skill.id);
                    nextTurn.skills=data.skills ?? [];
                }
            }
            const turnEvent={gameId:this.game.gameId,name:"turnStart",data};
            // await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);  
            // nextTurn.status=1;  
            // await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});

            // await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
        }       
    }  
    
    async turnEnd(){
  
         if(!this.game||!this.game.currentRound) return;
         const round = this.game.currentRound;
         const currentTurn = round.turns?.find((turn:CombatTurn)=>turn.status===1||turn.status===2);
         if(currentTurn){
            // console.log("currentTurn",currentTurn);
            currentTurn.status=3;
            // console.log("gameId",this.game.gameId);
            // console.log("roundNo",round.no);
            const turnEvent={gameId:this.game.gameId,name:"turnEnd",data:{...currentTurn}};
            // await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);    
            // await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});
            // await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
         }  
        const nextTurn = round.turns?.find((turn)=>turn.status===0);
       
    }    
   
}
export default GameManager