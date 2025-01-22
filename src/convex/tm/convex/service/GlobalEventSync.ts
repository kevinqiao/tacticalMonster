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
  handler: async (ctx) => {
    const events = await ctx.db.query("event").withIndex("by_sync", (q) => q.eq("isSynced", false)).collect();
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
        await ctx.db.patch(event._id, { isSynced: true, syncTime: Date.now() });
      }
    }  

  }
});
