import { CUser } from "../AuthManager";


export function handle(channel:number,data: any): CUser | null {
    // 实现你的自定义认证逻辑
    return {
        cuid:data.cuid,
        channel:channel,
        data:{name:"test"+data.cuid}
    };
}
