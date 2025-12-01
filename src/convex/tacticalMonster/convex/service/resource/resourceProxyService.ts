import { getTournamentUrl } from "../../config/tournamentConfig";
import { TOURNAMENT_CONFIG } from "../../config/tournamentConfig";

/**
 * 资源代理服务
 * 负责通过 HTTP 调用 Tournament 模块的资源服务
 */
export class ResourceProxyService {
    /**
     * 添加金币（调用 Tournament 模块）
     */
    static async addCoins(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }) {
        // 调用 Tournament 的 HTTP Action
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.ADD_RESOURCES),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: params.uid,
                    coins: params.coins,
                    source: params.source,
                    sourceId: params.sourceId,
                }),
            }
        );
        
        const result = await response.json();
        
        if (!response.ok || !result.ok) {
            throw new Error(result.error || "添加金币失败");
        }
        
        return result;
    }
    
    /**
     * 扣除金币（调用 Tournament 模块）
     */
    static async deductCoins(ctx: any, params: {
        uid: string;
        coins: number;
        source: string;
        sourceId?: string;
    }) {
        // 调用 Tournament 的 HTTP Action
        const response = await fetch(
            getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.DEDUCT_RESOURCES),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: params.uid,
                    coins: params.coins,
                    source: params.source,
                    sourceId: params.sourceId,
                }),
            }
        );
        
        const result = await response.json();
        
        if (!response.ok || !result.ok) {
            throw new Error(result.error || "扣除金币失败");
        }
        
        return result;
    }
}

