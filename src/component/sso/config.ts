
export const PROVIDERS = [
    { name: "telegram", path: "provider/TelegramAuthenticator" },
    { name: "discord", path: "provider/DiscordAuthenticator" },
    { name: "github", path: "provider/GithubAuthenticator" },
    { name: "google", path: "provider/GoogleAuthenticator" },
    { name: "facebook", path: "provider/FacebookAuthenticator" },
    { name: "twitter", path: "provider/TwitterAuthenticator" },
    { name: "linkedin", path: "provider/LinkedinAuthenticator" },
    { name: "instagram", path: "provider/InstagramAuthenticator" },
    { name: "youtube", path: "provider/YoutubeAuthenticator" },
]
export const PANELS: { pid: string, name: string, path: string }[] = [
    {
        pid: "1",
        name: "web",
        path: "panels/WebPanel1",

    },
    {
        pid: "2",
        name: "discord",
        path: "panels/WebPanel2",
    }
]