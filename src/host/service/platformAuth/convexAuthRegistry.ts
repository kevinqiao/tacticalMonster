/** Registry of Convex clients that should receive platform JWT via setAuth. */



import { looksLikePlatformJwt } from "./platformAccessToken";



export type ConvexAuthCapable = {

  setAuth: (

    fetchToken: () => Promise<string | null | undefined> | string | null | undefined

  ) => void | (() => void);

  clearAuth?: () => void;

};



type HttpAuthClient = {

  setAuth: (value: string) => void;

  clearAuth?: () => void;

};



const clients = new Set<ConvexAuthCapable>();

let currentFetchToken: (() => Promise<string | null>) | null = null;

let cachedHttpToken: string | null = null;



/** ConvexHttpClient.setAuth(jwt: string); websocket clients use setAuth(fetchToken, onChange?). */

function isHttpStyleAuthClient(client: ConvexAuthCapable): boolean {
  return client.setAuth.length < 2;
}

function asHttpAuthClient(client: ConvexAuthCapable): HttpAuthClient {
  return client as unknown as HttpAuthClient;
}



function bindHttpClient(client: HttpAuthClient, token: string | null): void {

  if (token) {

    client.setAuth(token);

  } else if (client.clearAuth) {

    client.clearAuth();

  }

}



function bindWebSocketClient(client: ConvexAuthCapable): void {

  if (!currentFetchToken) {

    if (client.clearAuth) {

      client.clearAuth();

    } else if (!isHttpStyleAuthClient(client)) {

      client.setAuth(async () => null);

    }

    return;

  }



  const fetchToken = currentFetchToken;

  client.setAuth(async () => {

    const token = await fetchToken();

    return looksLikePlatformJwt(token) ? token : null;

  });

}



/** Immediately push JWT to ConvexHttpClient instances (avoid async bind race after login). */

export function syncPlatformAuthTokenToClients(token: string | null | undefined): void {

  cachedHttpToken = looksLikePlatformJwt(token) ? token : null;

  for (const client of clients) {

    if (isHttpStyleAuthClient(client)) {

      bindHttpClient(asHttpAuthClient(client), cachedHttpToken);

    }

  }

}



export function registerConvexAuthClient(client: ConvexAuthCapable): () => void {

  clients.add(client);

  if (isHttpStyleAuthClient(client)) {

    bindHttpClient(asHttpAuthClient(client), cachedHttpToken);

  } else {

    bindWebSocketClient(client);

  }

  return () => {

    clients.delete(client);

  };

}



export function bindPlatformAuthToClients(

  fetchToken: () => Promise<string | null>

): void {

  currentFetchToken = fetchToken;

  void fetchToken().then((token) => {

    syncPlatformAuthTokenToClients(token);

  });

  for (const client of clients) {

    if (!isHttpStyleAuthClient(client)) {

      bindWebSocketClient(client);

    }

  }

}



export function clearPlatformAuthOnClients(): void {

  currentFetchToken = null;

  syncPlatformAuthTokenToClients(null);

  for (const client of clients) {

    if (!isHttpStyleAuthClient(client)) {

      bindWebSocketClient(client);

    }

  }

}



export function getRegisteredConvexAuthClientCount(): number {

  return clients.size;

}

