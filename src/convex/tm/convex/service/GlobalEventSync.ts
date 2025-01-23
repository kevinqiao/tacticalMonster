import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
export interface Event{
  id:string;
  name:string;
  uid?:string;
  time:number;
  data:any;
}
const apiEndpoint = "https://example.com/api/receive-data"; // 替换为目标 API 的 URL
const apiToken = "your-api-key";

export const sync = internalMutation({
  args: { appid: v.string() },
  handler: async (ctx, { appid }) => {
    const events = await ctx.db.query("tm_event").withIndex("by_name", (q) => q.eq("name", "gameCreated").eq("isSynced", false)).collect(); 
    console.log("events",events);
    if(events.length === 0) return null;
     const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`, // 添加认证头
        "Content-Type": "application/json",
      },
      body: JSON.stringify(events), // 将数据序列化为 JSON 格式
    });
    if (response.ok) {
      for (const event of events) {
        await ctx.db.patch(event._id, { isSynced: true});
      }
    }  

  }
});
