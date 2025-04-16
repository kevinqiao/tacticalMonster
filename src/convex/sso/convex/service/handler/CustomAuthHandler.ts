import { CUser } from "../AuthManager";


export function handle(channelId: string, data: any): CUser | null {
    // 实现你的自定义认证逻辑
    return {
        cuid: data.cuid,
        cid: channelId,
        data: { name: "test" + data.cuid }
    };
}
