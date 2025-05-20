import { useConvex } from "convex/react";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUrlParams } from "util/PageUtils";
import { api } from "../convex/sso/convex/_generated/api";

// 平台类型
const PLATFORM_TYPE = {
  DEFAULT: -1,
  TELEGRAM: 0,
  DISCORD: 1,
  META: 2,
} as const;

// Telegram SDK 类型
export interface TelegramWebApp {
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string };
    query_id?: string;
  };
  ready: () => void;
  close: () => void;
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
  };
  onEvent: (eventType: string, callback: () => void) => void;
  showAlert: (message: string) => void;
}

// Meta SDK 类型
export interface MetaWebApp {
  init: (config: { appId: string; version: string; status: boolean; cookie: boolean; xfbml: boolean }) => void;
  api: (path: string, params: { fields: string }, callback: (response: any) => void) => void;
  getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } }) => void) => void;
  login: (callback: (response: { authResponse?: { accessToken: string } }) => void, options: { scope: string }) => void;
  ui: (options: { method: string; message: string }) => void;
}

// Discord SDK 类型
export interface DiscordSDK {
  ready: () => Promise<void>;
  commands: {
    authorize: (config: {
      client_id: string;
      response_type: string;
      state?: string;
      prompt?: string;
      scope: string[];
    }) => Promise<{ code: string }>;
    authenticate: (config: { access_token: string }) => Promise<{ access_token: string; user: { id: string; username: string } }>;
  };
  subscribe: (event: string, callback: (data: any) => void) => void;
}

// 用户信息类型
export interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
    FB?: MetaWebApp;
  }
}

// 平台配置
const PLATFORMS: Record<
  string,
  {
    name: string;
    type: number;
    url: string;
    scripts: { name: string; src: string }[];
    initialize: (configuration: any) => Promise<{ sdk?: any; user?: UserInfo | undefined }>;
  }
> = {
  TELEGRAM: {
    name: "Telegram",
    type: PLATFORM_TYPE.TELEGRAM,
    url: "https://t.me/solitaire_game_bot",
    scripts: [{ name: "sdk", src: "https://telegram.org/js/telegram-web-app.js" }],
    initialize: async (configuration: any) => {

      if (window.Telegram?.WebApp) {

        window.Telegram.WebApp.ready();
        console.log("Telegram initialized", window.Telegram.WebApp);
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        return {
          sdk: window.Telegram.WebApp, user: user ? { id: String(user.id), username: user.username || user.first_name } : undefined,
        };
      } else {
        console.warn("Telegram WebApp not available");
        return {};
      }
    },
  },
  DISCORD: {
    name: "Discord",
    type: PLATFORM_TYPE.DISCORD,
    url: "https://discord.com/solitaire_game_bot",
    scripts: [],
    initialize: async (configuration: any) => {
      try {
        const { DiscordSDK } = await import("@discord/embedded-app-sdk");
        const discordSdk = new DiscordSDK(process.env.VITE_DISCORD_CLIENT_ID || "YOUR_DISCORD_CLIENT_ID");
        await discordSdk.ready();

        // 授权
        const { code } = await discordSdk.commands.authorize({
          client_id: process.env.VITE_DISCORD_CLIENT_ID || "YOUR_DISCORD_CLIENT_ID",
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify"],
        });

        // 交换 access_token
        const response = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();

        // 认证并获取用户信息
        const auth = await discordSdk.commands.authenticate({ access_token });
        console.log("Discord initialized with user:", auth.user);

        return {
          sdk: discordSdk,
          user: {
            id: auth.user.id,
            username: auth.user.username,
          },
        };
      } catch (error) {
        console.error("Discord initialization failed:", error);
        throw error;
      }
    },
  },
  META: {
    name: "Meta",
    type: PLATFORM_TYPE.META,
    url: "https://www.facebook.com/solitaire_game_bot",
    scripts: [{ name: "sdk", src: "https://connect.facebook.net/en_US/sdk.js" }],
    initialize: async (configuration: any) => {
      if (window.FB) {
        window.FB.init({
          appId: process.env.VITE_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID",
          version: "v20.0",
          status: true, // 自动检查登录状态
          cookie: true,
          xfbml: true,
        });
        console.log("Meta initialized");

        // 检查登录状态
        const loginStatus = await new Promise<{ status: string; authResponse?: { accessToken: string } }>((resolve) => {
          window.FB?.getLoginStatus((response) => resolve(response));
        });

        if (loginStatus.status === "connected") {
          // 已登录，直接获取用户信息
          const userData = await new Promise<any>((resolve) => {
            window.FB?.api("/me", { fields: "id,name" }, (response) => resolve(response));
          });
          if (userData.id) {
            return {
              sdk: window.FB,
              user: { id: userData.id, username: userData.name },
            };
          }
        } else {
          // 未登录，尝试登录
          const loginResponse = await new Promise<{ authResponse?: { accessToken: string } }>((resolve) => {
            window.FB?.login(
              (response) => resolve(response),
              { scope: "public_profile" } // 请求权限
            );
          });

          if (loginResponse.authResponse) {
            const userData = await new Promise<any>((resolve) => {
              window.FB?.api("/me", { fields: "id,name" }, (response) => resolve(response));
            });
            if (userData.id) {
              return {
                sdk: window.FB,
                user: { id: userData.id, username: userData.name },
              };
            }
          }
        }
        console.warn("Meta user not logged in or login failed");
        return { sdk: window.FB };
      } else {
        console.warn("Meta SDK not available");
        return {};
      }
    },
  },
};

// 脚本状态
interface ScriptStatus {
  status: "idle" | "loading" | "loaded" | "error";
  src: string;
}
export interface Platform {
  name?: string;
  support: number;
  paramters?: { url: string };
}

// 上下文接口
interface IPlatformContext {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  platform: Platform | undefined;
  sdk: any;
  // authenticatorLoaded: boolean;
  // onAuthenticatorLoaded: () => void;
  errorMessage?: string;
  user?: UserInfo;
}

const PlatformContext = createContext<IPlatformContext | undefined>(undefined);

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  // const [configuration, setConfiguration] = useState<Configuration | undefined>(undefined);
  // const [authenticatorLoaded, setAuthenticatorLoaded] = useState(false);
  const [platform, setPlatform] = useState<Platform | undefined>(undefined);
  const [scripts, setScripts] = useState<Record<string, ScriptStatus>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [sdk, setSdk] = useState<any | undefined>();
  const [user, setUser] = useState<UserInfo | undefined>();
  const convex = useConvex();
  const params = useUrlParams();
  // 动态加载脚本

  const loadScript = useCallback((key: string, src: string) => {
    console.log("loadScript", scripts, key, src);
    if (scripts[key]?.status === "loaded" && scripts[key]?.src === src) {
      return
    }

    setScripts((prev) => ({
      ...prev,
      [key]: { status: "loading", src },
    }));


    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.id = `script-${key}`;
    script.onload = () => {
      console.log("script loaded", key, src);
      setScripts((prev) => ({
        ...prev,
        [key]: { status: "loaded", src },
      }));

    };

    script.onerror = () => {
      setScripts((prev) => ({
        ...prev,
        [key]: { status: "error", src },
      }));
      setErrorMessage(`Failed to load script: ${src}`);
    };

    document.body.appendChild(script);

  }, []);

  // 删除脚本
  const removeScript = useCallback((key: string) => {
    const scriptElement = document.getElementById(`script-${key}`);
    if (scriptElement) {
      document.body.removeChild(scriptElement);
    }
    setScripts((prev) => {
      const newScripts = { ...prev };
      delete newScripts[key];
      return newScripts;
    });
  }, []);

  // 初始化平台
  const initializePlatform = useCallback(async () => {
    const platformInfo = PLATFORMS[platform?.name || ""];
    if (platformInfo) {
      try {
        const { sdk, user } = await platformInfo.initialize(platform?.paramters);
        if (sdk) {
          setSdk(sdk);
        }
        if (user) {
          setUser(user);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Platform initialization failed");
      }
    }
  }, [platform]);


  // 状态检查
  const isLoaded = useMemo(
    () => {
      if (!platform) {
        return false;
      }
      const platformInfo = PLATFORMS[platform?.name || ""];
      if (platformInfo.scripts.length === 0) {
        return true;
      }
      if (Object.values(scripts).length === 0) {
        return false;
      }
      return Object.values(scripts).every((script) => script.status === "loaded");
    },
    [scripts, platform]
  );
  const isLoading = useMemo(() => Object.values(scripts).some((script) => script.status === "loading"), [scripts]);
  const hasError = useMemo(() => Object.values(scripts).some((script) => script.status === "error"), [scripts]);
  useEffect(() => {
    if (isLoaded) {
      initializePlatform();
    }
  }, [isLoaded]);
  useEffect(() => {
    const loadPlatform = async () => {
      if (params.get("pid") && params.get("p")) {
        const pt: Platform = await convex.query(api.service.PlatformManager.findPlatform, { partner: params.get("pid") || undefined, platform: params.get("p") || undefined });
        console.log("loadPlatform", pt);
        if (pt) {
          setPlatform(pt)
        }
      }
    }
    if (!platform) {
      loadPlatform();
    }
  }, []);
  // 加载平台脚本
  useEffect(() => {
    const loadScripts = async () => {

      try {
        setErrorMessage(undefined);
        setUser(undefined);
        setSdk(undefined);

        const platformInfo = PLATFORMS[platform?.name || ""];
        if (!platformInfo) {
          setErrorMessage(`Unknown platform: ${platform}`);
          return;
        }
        // // 清理现有脚本
        // Object.keys(scripts).forEach((key) => removeScript(key));
        for (const script of platformInfo.scripts) {
          console.log("start loadScript", script.name, script.src);
          loadScript(script.name, script.src);
        }
      } catch (error) {
        console.error("加载脚本出错:", error);
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      }
    };
    if (platform?.name && platform?.support) {
      loadScripts();
    }
  }, [loadScript, removeScript, platform]);

  useEffect(() => {
    // 清理平台状态

    return () => {
      if (platform?.name === "TELEGRAM" && window.Telegram?.WebApp) {
        // window.Telegram.WebApp.MainButton.hide();
      }
      if (platform?.name === "DISCORD" && sdk) {
        sdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", () => { });
      }

      // Meta 无需特殊清理
    };
  }, [platform, sdk]);
  useEffect(() => {
    console.log("cleanup scripts", scripts);
    return () => {
      console.log("cleanuped scripts", scripts);
      const platformInfo = PLATFORMS[platform?.name || ""];
      if (platformInfo) {
        Object.keys(platformInfo.scripts).forEach((key) => removeScript(key));
      }
    };
  }, [platform]);

  return (
    <PlatformContext.Provider
      value={{
        isLoaded,
        isLoading,
        hasError,
        platform,
        sdk,
        errorMessage,
        user,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatform 必须在 PlatformProvider 中使用");
  }
  return context;
};

export default usePlatform;