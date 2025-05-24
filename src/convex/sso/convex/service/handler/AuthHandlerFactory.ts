import { TelegramAuthHandler } from "./TelegramAuthHandler";
export enum PlatformType {
    TELEGRAM = "telegram",
}
export interface Platform {
    id: string;
    type: PlatformType;
    config: any;
}

export interface AuthHandler {
    handle: (ctx: any, { initData }: any) => Promise<any>;
}

export class AuthHandlerFactory {
    static getHandler(platformType: PlatformType): AuthHandler | undefined {
        switch (platformType) {
            case PlatformType.TELEGRAM:
                return new TelegramAuthHandler();
            default:
                return
        }
    }
}
