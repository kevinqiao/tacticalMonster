import { SkillManager } from "../../component/kumu/battle/service/SkillManager";
import { Skill } from "../../component/kumu/battle/types/CharacterTypes";
import { CombatEvent, CombatTurn, GameCharacter, GameModel } from "../../component/kumu/battle/types/CombatTypes";
import { internal } from "../_generated/api";
import { getPosition, getWalkPath } from "../utils/gameUtils";
import { calculateStats } from "../utils/Utlis";
class GameManager {
    private dbCtx: any;
    private game:GameModel|null; 
    constructor(ctx: any) {
        this.dbCtx = ctx;
        this.game=null;
    }
    async createGame() {
        const players = await this.dbCtx.runQuery(internal.dao.tmPlayerDao.findAll);
        if (players.length > 1) {
            const map = await this.dbCtx.runQuery(internal.dao.tmMapDataDao.find, { mapId: "1" });
            const gameObj:any = { 
                challenger: players[0].uid, 
                challengee: players[1].uid, 
                players:players.map((player:any)=>({uid:player.uid,name:player.name,avatar:player.avatar})),
                map:"1",
                round: 0 
            };
            const gameId = await this.dbCtx.runMutation(internal.dao.tmGameDao.create, gameObj);
            gameObj.gameId=gameId; 
            gameObj.map = map; 
            if (gameId) {
                const gameCharacters: any[] = [];
                for (const player of players) {                 
                    const characters = await this.dbCtx.runQuery(internal.dao.tmPlayerCharacterDao.findByUid, { uid: player.uid });
                    for (const character of characters) {
                        const position=getPosition(gameObj,map,player);
                        const stats = calculateStats(character.attributes);
                        const gameCharacter = {...character,...position,gameId,_id:undefined,_creationTime:undefined,stats,attributes:undefined,asset:character.asset,skills:character.unlockSkills,unlockSkills:undefined};
                        await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.create, gameCharacter);
                        gameCharacters.push(gameCharacter);
                    }

                }
                // gameObj.characters=gameCharacters;

                for(const player of players){                    
                    const event = { uid: player.uid, name: "GameCreated", data: { gameId } };
                    await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
                }
                const game = await this.dbCtx.runQuery(internal.dao.tmGameDao.get, {gameId});
                if(game){
                    this.game={...game,gameId};
                    await this.gameStart();
                }

                // gameObj.players=players;    
                // this.game=gameObj;  
            
            }
        }
    }
    async attack(gameId: string, data: { attacker: { uid: string, character_id: string, killSelect: string }, target: { uid: string, character_id: string } }): Promise<CombatEvent|null> {
        console.log("attack", gameId, data);
        this.game = await this.dbCtx.runQuery(internal.dao.tmGameDao.get, { gameId });  
        const {attacker,target}=data;
        const attackerCharacter = this.game?.characters.find((c:any)=>c.uid===attacker.uid&&c.character_id===attacker.character_id);
        const targetCharacter = this.game?.characters.find((c:any)=>c.uid===target.uid&&c.character_id===target.character_id);
        if(!attackerCharacter||!targetCharacter) return null;
        const skillId = attacker.killSelect;
        const skill = attackerCharacter.skills?.find((s:any)=>s.id===skillId);
        if(!skill) return null;
        console.log("skill",skill)  
        // const skillService = new SkillManager(attackerCharacter,this.game as GameModel);
        // const result = await skillService.useSkill(skillId,targetCharacter);
        // if(!result) return false;   
        // await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.update, {gameId,uid,character_id,data:{q:to.q,r:to.r}});
        const event={gameId,uid:attacker.uid,name:"attack",data};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:gameId,data:{lastUpdate:Date.now()}});
        await this.turnEnd();
        return event;
    }   
    async walk(gameId: string, uid: string, character_id: string, to: {q: number, r: number}): Promise<boolean> {
        // console.log("to",to);

        this.game = await this.dbCtx.runQuery(internal.dao.tmGameDao.get, { gameId });                
        if (!this.game || !uid || !this.game.map) return false;
        this.game.gameId=gameId;    
        const character = this.game.characters.find((c:any) => 
            c.character_id === character_id && c.uid === uid
        );
        if (!character) return false;   
        const from = {
            q: character.q ?? 0,
            r: character.r ?? 0
        };
        const path = getWalkPath(this.game.characters,this.game.map,from,to);
        console.log("path",path.length,character.move_range)    
        if(!path||path.length===0||path.length-1>(character.move_range??0)) return false;
        const round = this.game.currentRound;
        const currentTurn = round?.turns?.find((turn:CombatTurn)=>turn.status===1||turn.status===2); 
        console.log("walk ragne:",character.move_range,path.length-1,currentTurn?.status)
        // if(character.move_range&&character.move_range<path.length-1) return false;   
       

        character.q=to.q;
        character.r=to.r;   
        await this.dbCtx.runMutation(internal.dao.tmGameCharacterDao.update, {gameId,uid,character_id,data:{q:to.q,r:to.r}});
        const event={gameId,name:"walk",data:{uid,character_id,path}};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, event);
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:gameId,data:{lastUpdate:Date.now()}});
    
        if(character.move_range===(path.length-1)||currentTurn?.status===2){
             await this.turnEnd();
        }else{
             await this.turnSecond();
        }        
        return true;
     
    }
    async gameStart() {
        if(!this.game) return;
        //游戏开始前的处理 , 比如添加buff ，被动技能的执行
        const gameStartResult={};
        const gameEvent={gameId:this.game?.gameId,name:"gamePreStart",data:{gameId:this.game?.gameId,result:gameStartResult}};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, gameEvent);
        //游戏开始后的处理 , 比如添加buff ，被动技能的执行
        const gameStartResult2={};
        const gameEvent2={gameId:this.game?.gameId,name:"gamePostStart",data:{gameId:this.game?.gameId,result:gameStartResult2}};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, gameEvent2);   
        //
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
       await this.roundStart()
    }
    async gameEnd(){
        const gameEvent={gameId:this.game?.gameId,name:"gameEnd",data:{gameId:this.game?.gameId}};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, gameEvent);
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game?.gameId,data:{status:2,lastUpdate:Date.now()}});
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
            await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);  
            nextTurn.status=1;  
            await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});

            await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
        }       
    }  
    async turnSecond(){
       
        if(!this.game||!this.game.currentRound) return;
        // console.log("turnStart",this.game.currentRound);
        const round = this.game.currentRound;
        const currentTurn = round.turns?.find((turn:CombatTurn)=>turn.status===1);
        if(currentTurn){
            const data:CombatTurn= {...currentTurn};
            const character = this.game.characters.find(c=>c.character_id===currentTurn.character_id);
            if(character){              
                const skillService = new SkillManager(character,this.game);                 
                const skills = await skillService.getAvailableSkills();
                // console.log("game turn second    skills",skills)
                if(skills){
                    data.skills=skills.map((skill:Skill)=>skill.id);    
                    currentTurn.skills=data.skills ?? [];
                }
            }
            const turnEvent={gameId:this.game.gameId,name:"turnSecond",data:{...currentTurn}};
            await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);  
            currentTurn.status=2;  
            await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});
            await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
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
            await this.dbCtx.runMutation(internal.dao.tmEventDao.create, turnEvent);    
            await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:round.no,data:{turns:round.turns}});
            await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{lastUpdate:Date.now()}});
         }  
        const nextTurn = round.turns?.find((turn)=>turn.status===0);
        if(!nextTurn){
           await this.roundEnd();
        }else{
            await this.turnStart();
        }
    }
    async roundEnd(){
        if(!this.game||!this.game.currentRound) return;  
        // console.log("roundEnd",this.game.currentRound);
        const roundEvent={gameId:this.game?.gameId,name:"roundEnd",data:{round:this.game?.currentRound?.no}};
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, roundEvent);
        // console.log("roundEnd2",this.game.currentRound);
        await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.update, {gameId:this.game.gameId,no:this.game.currentRound.no,data:{status:2,endTime:Date.now()}});
        // console.log("roundEnd3",this.game.currentRound);
        if(this.game.currentRound.no>=0&&this.game.currentRound.no<10){
          await  this.roundStart();
        }else{
            await this.gameEnd();
        }
    }   
    async roundStart() {
        if(!this.game) return;  
        const roundNo = this.game.currentRound?this.game.currentRound.no+1: 1;
        const turns = this.game?.characters?.map((character: GameCharacter) => ({
            uid: character.uid as string,
            character_id: character.character_id as string,
            status: 0
        })) ?? [];

        const round = {
            gameId: this.game?.gameId,
            no: roundNo,
            status: 0,
            turns
        };
        this.game.currentRound = round;
        const roundEvent={gameId:this.game?.gameId,name:"roundStart",data:{...round}};
        await this.dbCtx.runMutation(internal.dao.tmGameRoundDao.create, round);
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game.gameId,data:{round:round.no,lastUpdate:Date.now()}});
        await this.dbCtx.runMutation(internal.dao.tmEventDao.create, roundEvent);
        await this.dbCtx.runMutation(internal.dao.tmGameDao.update, {id:this.game?.gameId,data:{lastUpdate:Date.now()}});
        // console.log("roundStart2",this.game.currentRound);
        await this.turnStart();
    }   
}
export default GameManager