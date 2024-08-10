import { User } from "model/User";

export const isRunningInTelegramApp = (): boolean => {
    const userAgent: string = navigator.userAgent || navigator.vendor || window.opera;
    return /Telegram/i.test(userAgent);
}

export const getTerminalType = (): number => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent) || (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)) {
        return 0;
    }
    // 检测是否在 Telegram Desktop Web Browser 中
    else if (/Windows NT|Macintosh|Linux x86_64/i.test(userAgent)) {
        return 1;
    }
    return -1;
}


export const embedAuth = async (app: any): Promise<User | null> => {
    if (app.context === "tg" && window.Telegram?.WebApp) {
        const telegramData = window.Telegram.WebApp.initData;
        try {
            const BOT_URL = "https://telegram-bot-8bgi.onrender.com/tg/auth";
            const res = await fetch(BOT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify({ authData: telegramData }),
            });
            const json: { status: string; message: any; } = await res.json();
            if (json.status === "success")
                return { ...json.message, authEmbed: 1 };
        } catch (err) {
            console.log(err)
        }
    }
    return null
}
export const authToken = async (auth: any): Promise<User | null> => {
    if (auth) {
        try {
            const authData = auth;
            const AUTH_URL = "http://localhost:80/token/auth";
            const res = await fetch(AUTH_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(authData),
            });
            const json: { status: string; message: any; } = await res.json();
            if (json.status === "success")
                return { ...json.message, authEmbed: 1 };
        } catch (err) {
            console.log(err)
        }
    }
    return null
}
