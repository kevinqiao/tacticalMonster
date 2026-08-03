import { ConvexHttpClient } from 'convex/browser';

import { casualTournamentFns } from '@/component/lobby/casual/service/casualConvexFunctionRefs';
import { portalTournamentFns } from '@/component/lobby/portal/service/portalConvexFunctionRefs';
import { PORTAL_CONVEX_URL } from '@/component/lobby/portal/service/usePortalManager';
import { registerConvexAuthClient } from 'host/service/platformAuth/convexAuthRegistry';

import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';

const _casualUrlRaw = import.meta.env.VITE_CONVEX_URL_CASUAL;
const CASUAL_CONVEX_URL =
    typeof _casualUrlRaw === 'string' && _casualUrlRaw.trim() !== ''
        ? _casualUrlRaw.trim()
        : 'https://amicable-alpaca-980.convex.cloud';

const clientCache = new Map<string, ConvexHttpClient>();

function httpClientForBridge(platformBridge: 'portal' | 'casual'): ConvexHttpClient {
    const url = platformBridge === 'portal' ? PORTAL_CONVEX_URL : CASUAL_CONVEX_URL;
    let client = clientCache.get(url);
    if (!client) {
        client = new ConvexHttpClient(url);
        registerConvexAuthClient(client);
        clientCache.set(url, client);
    }
    return client;
}

/** 按 platformBridge 从 portal / casualPlatform 拉取同桌榜（含 bot stagger 中的 partial 榜） */
export async function fetchCasualAsyncTableSummaryForGame(args: {
    matchGameId: string;
    platformBridge?: 'portal' | 'casual';
}): Promise<CasualAsyncTableSummaryUI | null> {
    const bridge = args.platformBridge ?? 'casual';
    const http = httpClientForBridge(bridge);
    const fn =
        bridge === 'portal'
            ? portalTournamentFns.getCasualAsyncTableSummaryForGame
            : casualTournamentFns.getCasualAsyncTableSummaryForGame;
    try {
        const row = await http.query(fn, {
            matchGameId: args.matchGameId,
        });
        if (!row || typeof row !== 'object' || !Array.isArray((row as { rows?: unknown }).rows)) {
            return null;
        }
        return row as CasualAsyncTableSummaryUI;
    } catch (e) {
        console.warn('[Casual] fetchCasualAsyncTableSummaryForGame', bridge, e);
        return null;
    }
}
