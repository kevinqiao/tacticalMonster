import { cascade3D } from "./over/cascade3D";
import { cascadeBounce } from "./over/cascadeBounce";
import { cascadeClassic } from "./over/cascadeClassic";
import { cascadeClassicSimple } from "./over/cascadeClassicSimple";
import { cascadeFirework } from "./over/cascadeFirework";
import { cascadeFountain } from "./over/cascadeFountain";
import { cascadeSimple } from "./over/cascadeSimple";
import { cascadeSingleCard } from "./over/cascadeSingleCard";

export const gameOverEffect = ({
    effectType,
    data,
    onComplete
}: {
    effectType?: string;
    data: any;
    onComplete?: () => void
}) => {
    const effectMap: Record<string, ({ data, onComplete }: { data: any; onComplete?: () => void }) => void> = {
        'simple': cascadeSimple,
        'bounce': cascadeBounce,
        'fountain': cascadeFountain,
        'firework': cascadeFirework,
        'classic': cascadeClassic, // 经典效果（所有卡）
        'classicSimple': cascadeClassicSimple, // 简化版（前5张）
        'singleCard': cascadeSingleCard, // 单卡测试
        'three3D': cascade3D, // Three.js 3D效果
        'default': cascade3D, // Three.js 3D效果
    };

    const cascadeEffect = effectMap[effectType || 'default'] || cascadeFountain;
    cascadeEffect({ data, onComplete });
};

