"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { User } from "../../../../model/User";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { handle } from "./handler/CustomAuthHandler";


const ACCESS_TOKEN_SECRET = "12222222";
export interface CUser {   
    cid?: string;
    cuid: string;
    channel: number;
    data: {[k:string]:any};
}
// interface User {
//     uid?: string;
//     cid: string;
//     partner: number;
//     token?: string;
//     name?: string;
//     email?: string;
//     phone?: string;
// }

export const authenticate = action({
    args: {channel:v.number(),data:v.any(),partner:v.optional(v.number())},
    handler: async (ctx, {channel,data,partner}): Promise<User | null> => {
        const pid = partner??1;
        const cuser = handle(data);
     
        if(cuser?.cuid && cuser?.channel){
            const cid = cuser.cuid+"-"+cuser.channel;
            await ctx.runMutation(internal.dao.cuserDao.update,{cuid:cuser.cuid,channel:cuser.channel,data:{name:"kevin1"}}); 
            const uid = cid+"-"+pid;
            const user:User|null = await ctx.runQuery(internal.dao.userDao.find,{uid});
      
            if(!user){              
                const u:User|null = await ctx.runMutation(internal.dao.userDao.create, {cid,uid, partner:pid,token:"",data:cuser.data});
                if(u?.uid){
                  const token = jwt.sign(u,ACCESS_TOKEN_SECRET, { expiresIn: 60*60*24*30 }); 
                  await ctx.runMutation(internal.dao.userDao.update,{uid, data:{token}}); 
                  return Object.assign({},u,{token,_id:undefined, _creationTime:undefined});    
                }
            }else if(user?.uid){
                const token = jwt.sign(user,ACCESS_TOKEN_SECRET, { expiresIn: 60*60*24*30 }); 
                await ctx.runMutation(internal.dao.userDao.update,{uid:user.uid, data:{token}});  
                return Object.assign({},user,{token,_id:undefined, _creationTime:undefined});     
            }   
        }
        return null;    
    }
})