/**
 * 哈希工具函数
 * 不使用 "use node"，可以在 mutation 和 action 中使用
 * 使用简单的哈希算法，与 crypto MD5 不同，但保证一致性
 */

/**
 * 简单哈希函数（适用于 mutation 环境）
 * 注意：这个函数与 crypto.createHash("md5") 产生的结果不同
 * 如果需要与 crypto MD5 保持一致，需要在 action 中使用 crypto
 */
export function simpleHash(str: string): string {
    const normalizedEmail = str.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < normalizedEmail.length; i++) {
        const char = normalizedEmail.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // 转换为固定长度的十六进制字符串（8位，类似 MD5 的前8位）
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 从 email 生成 UID
 */
export function getUIDFromEmail(email: string): string {
    return simpleHash(email);
}

