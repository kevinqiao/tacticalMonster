"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { action } from "./_generated/server";


const ACCESS_TOKEN_SECRET = "12222222";
export interface CUser {   
    cid?: string;
    cuid: string;
    channel: number;
    data: {[k:string]:any};
}
interface User {
    uid?: string;
    cid: string;
    partner: number;
    token?: string;
    name?: string;
    email?: string;
    phone?: string;
}

export const authorize = action({   
    args: {accessToken:v.string()},
    handler: async (ctx, {accessToken})=> {
        const user = jwt.verify(accessToken,ACCESS_TOKEN_SECRET);
        console.log(user)
    }   
})