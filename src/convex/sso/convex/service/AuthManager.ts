"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { handle } from "./handler/CustomAuthHandler";


const ACCESS_TOKEN_SECRET = "12222222";

interface User {
    uid?: string;
    cid: string;
    partner: number;
    token?: string;
    name?: string;
    email?: string;
    phone?: string;
}

export const authenticate = action({
    args: {channel:v.number(),data:v.any(),partner:v.optional(v.number())},
    handler: async (ctx, {channel,data,partner}): Promise<(User & {token: string}) | null> => {
        const pid = partner??1;
        const cuser = handle(data);
        console.log(cuser);
        if(cuser?.cuid && cuser?.channel){
            const cid = cuser.cuid+"-"+cuser.channel;
            await ctx.runMutation(internal.dao.cuserDao.update,{...cuser});   
            const user:User|null = await ctx.runQuery(internal.dao.userDao.findByPartner,{cid,partner:pid});      
            if(!user){              
                const u:User|null = await ctx.runMutation(internal.dao.userDao.create, {...cuser, cid, partner:pid,token:""});
                if(u?.uid){
                  const token = jwt.sign(u,ACCESS_TOKEN_SECRET, { expiresIn: 60*60*24*30 }); 
                  await ctx.runMutation(internal.dao.userDao.update,{uid:u.uid, data:{token}});  
                  return {...u,token};    
                }
            }else if(user?.uid){
                const token = jwt.sign(user,ACCESS_TOKEN_SECRET, { expiresIn: 60*60*24*30 }); 
                await ctx.runMutation(internal.dao.userDao.update,{uid:user.uid, data:{token}});  
                return {...user,token};      
            }   
        }
        return null;    
    }
})