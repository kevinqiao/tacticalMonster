import { CUser } from "../AuthManager";


export function handle(data: any): CUser | null {
    // 实现你的自定义认证逻辑
    return {
        cuid:"11111",
        channel: 1,
        data: {name:"kevin1"}
    };
}
