const PLATFORMS = {
    BROWSER: "browser",
    TELEGRAM: "telegram",
    DISCORD: "discord",
    GITHUB: "github",
    GOOGLE: "google",
    FACEBOOK: "facebook",
    TWITTER: "twitter",
    LINKEDIN: "linkedin",
    INSTAGRAM: "instagram",
    YOUTUBE: "youtube",
    PINTEREST: "pinterest",
    REDDIT: "reddit",
}
const PROVIDERS = [
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
const PANELS = [
    {
        pid: "1",
        name: "telegram",
        path: "provider/TelegramAuthenticator",
        type: 0,
        platform: "telegram",
    },
    {
        name: "discord",
        path: "provider/DiscordAuthenticator",
        type: 0,
        platform: "discord",
    }
]