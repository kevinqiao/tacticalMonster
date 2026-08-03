export type PartnerAuthMessage = {
  type: "PARTNER_AUTH";
  token: string;
  pid?: number;
};

declare global {
  interface Window {
    __PARTNER_AUTH__?: { token: string; pid?: number };
  }
}

export function listenPartnerEmbedAuth(
  onAuth: (msg: { token: string; pid: number }) => void,
  allowedOrigins?: string[]
): () => void {
  const handler = (event: MessageEvent) => {
    if (allowedOrigins && allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin)) {
      return;
    }
    const data = event.data as PartnerAuthMessage | undefined;
    if (data?.type !== "PARTNER_AUTH" || typeof data.token !== "string") return;
    const pid = typeof data.pid === "number" ? data.pid : 0;
    onAuth({ token: data.token, pid });
  };

  window.addEventListener("message", handler);

  const injected = window.__PARTNER_AUTH__;
  if (injected?.token) {
    onAuth({
      token: injected.token,
      pid: typeof injected.pid === "number" ? injected.pid : 0,
    });
  }

  return () => window.removeEventListener("message", handler);
}
