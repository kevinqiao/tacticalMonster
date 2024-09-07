"use node";
import { v } from "convex/values";
import crypto from "crypto";
import { findDeviceOrders, findDevices, findMerchant, findOrder } from "../common/CloverRestAPI";
import { CHANNEL_AUTH } from "../model/Constants";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const verifyCustom = async (data: any): Promise<{ cid: string; username: string; email?: string; phone?: string; token: string } | null> => {

  return null;
}

const verifyClerk = async (data: any): Promise<{ cid: string; username: string; email?: string; phone?: string; token: string } | null> => {
  const { jwttoken } = data;
  if (jwttoken) {
    const url = "https://bot.fungift.org/clerk/token/decode";
    const res = await fetch(url, {
      method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwttoken}`, // 将 token 添加到请求头中
        mode: "cors",
      },
    });
    const json = await res.json();
    if (json.ok) {
      const { cid, username, email, phone, token } = json.message;
      return { cid, username, email, phone, token }
    }

  }
  return null;
}
const verifyTelegram = async (data: any): Promise<{ cid: string; username: string; email?: string; phone?: string; token: string } | null> => {
  const BOT_URL = "https://bot.fungift.org/tg/auth";
  const res = await fetch(BOT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ authData: data.authData }),
  })
  const json = await res.json();
  if (json.ok) {
    return json.message
  }
  return null;
}

const verifyCloverByCode = async (data: { accessToken: string }, pos: { merchantId: string }): Promise<{ cid: string; username: string; email?: string; phone?: string; token: string; role: number } | null> => {
  return { cid: "10000010002", username: "test", token: crypto.randomBytes(24).toString("hex"), role: 2 }
  // const CLOVER_URL = "https://apisandbox.dev.clover.com/v3/merchants/YOUR_MERCHANT_ID/employees";
  // const res = await fetch(CLOVER_URL, {
  //   method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${data.accessToken}`, // 将 token 添加到请求头中
  //     mode: "cors",
  //   },
  // });
  // const employee = await res.json();
  // if (employee) {
  //   const token = crypto.randomBytes(24).toString("hex");
  //   const { id, name, email } = employee;
  //   return { cid: id, username: name, email, token };
  // }
  // return null;
}
const verifyClover = async ({ merchantId, code, employeeId, accessToken }: { merchantId: string; code?: string; employeeId?: string; accessToken: string }): Promise<any> => {
  if (accessToken && merchantId) {
    // const merchant = await findMerchant({merchantId,accessToken});
    const merchant = await findMerchant({ merchantId, accessToken });
    console.log(merchant);
    const devices = await findDevices({ merchantId, accessToken });
    for (const device of devices.elements) {
      console.log(device)
    }
    // const employee = await findEmployee({ merchantId, employeeId, accessToken });
    // if(employee?.orders?.href){
    //   const url = employee.orders.href;
    //   //  const orders = await findEmployeeOrders({url,accessToken});
    const orders = await findDeviceOrders({ merchantId, deviceId: "1d13da18-a861-8612-0383-c3f793aac259", accessToken });
    for (const order of orders.elements) {
      console.log(order)
    }
    const order = await findOrder({ merchantId, orderId: "VJ47FE1YJ7WEG", accessToken })
    console.log(order)

  }
}
export const authorize = action({
  args: { partnerId: v.number(), app: v.optional(v.string()), channelId: v.number(), data: v.any() },
  handler: async (ctx, { app, channelId, partnerId, data }): Promise<any> => {

    const partner = await ctx.runQuery(internal.partner.findById, { pid: partnerId })
    // console.log("authorize:" + partnerId + ":" + channelId)
    const channel = await ctx.runQuery(internal.authchannel.find, { id: channelId })
    // console.log(channel)
    if (!channel) return;
    let auth: { cid: string; username: string; email?: string; phone?: string; token: string; role?: number } | null = null;

    switch (channel.provider) {

      case "clover": {
        const m = { merchantId: "ZN43AD4V5ZDD1", accessToken: "a4a86bf1-1b24-a2b2-1b80-0eb82eea2f03" }
        const res = await verifyClover(m);
        if (res) {

          auth = { cid: res.id, username: res.name, email: res.email, token: crypto.randomBytes(24).toString("hex"), role: res.role === 'ADMIN' ? 2 : 1 }
        } else
          return { ok: false, errorCode: 1 }
      }
        break;
      case "clerk":
        auth = await verifyClerk(data);
        break;
      case "telegram":
        auth = await verifyTelegram(data);
        break;
      case "custom":
        {
          const { employeeId, password } = data;          

        }
        break;
      case "twilio":

        break;
      case "5":

        break;
      default:
        break;
    }

    if (auth) {
      const user = await ctx.runMutation(internal.user.authorize, { ...auth, channel: channelId, partner: partnerId });
      console.log(user)
      await ctx.runMutation(internal.asset.update, { uid: user.uid, asset: 1, amount: 100 });
      await ctx.runMutation(internal.asset.update, { uid: user.uid, asset: 2, amount: 100 });

      const game = await ctx.runQuery(internal.games.findUserGame, { uid: user.uid });
      if (game?.battleId && !game.status) {
        const battle = await ctx.runQuery(internal.battle.findById, { battleId: game.battleId as Id<"battle"> })
        if (battle && ((battle.duration + battle.startTime) > Date.now()))
          user['battleId'] = battle._id
      }
      if (!user.role || user.role === 0) {
        const matching = await ctx.runQuery(internal.matchqueue.finByUid, { uid: user.uid });
        if (matching)
          user['insearch'] = 1;
        const assets = await ctx.runQuery(internal.asset.findUserAssets, { uid: user.uid });
        if (assets)
          user['assets'] = assets
      }
      return { ok: true, message: user };
    }
    return { ok: false, errorCode: 2 }
  },
});
export const authorizeClerk = action({
  args: { jwttoken: v.string(), partner: v.number(), app: v.optional(v.string()) },
  handler: async (ctx, { jwttoken, partner }): Promise<any> => {
    const url = "https://telegram-bot-8bgi.onrender.com/clerk/token/decode";
    const res = await fetch(url, {
      method: "GET", // 或 'POST', 'PUT', 'DELETE' 等
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwttoken}`, // 将 token 添加到请求头中
        mode: "cors",
      },
    });
    const json = await res.json();
    if (json.ok) {
      const user = await ctx.runMutation(internal.user.authorize, { ...json.data, channel: CHANNEL_AUTH.CLERK, partner });
      console.log("token:" + user.token)
      return { ok: true, message: user };
    }
    return { ok: false }
  },
});
