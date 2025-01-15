interface CUser {   
    cid: string;
    cuid: string;
    channel: number;
    data: {[k:string]:any};
}

export function handle(data: any): CUser | null {
    // 实现你的自定义认证逻辑
    return {
        cid: data.id,
        cuid: data.id,
        channel: 1,
        data: data
    };
}
