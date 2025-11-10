/**
 * Deterministic pseudo-random number helpers based on xmur3 + mulberry32.
 * Allows reproducible shuffles given the same seed.
 */

function xmur3(str: string): () => number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(a: number): () => number {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Create a seeded pseudo-random number generator.
 * @param seed string or number seed value
 */
export function createSeededRandom(seed: string | number): () => number {
    if (typeof seed === "number") {
        return mulberry32(seed);
    }
    const hash = xmur3(seed)();
    return mulberry32(hash);
}

