import { cascadeBounce } from "./over/cascadeBounce";
import { cascadeFirework } from "./over/cascadeFirework";
import { cascadeFountain } from "./over/cascadeFountain";
import { cascadeSimple } from "./over/cascadeSimple";

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
        'default': cascadeFountain, // 默认使用喷泉效果
    };

    const cascadeEffect = effectMap[effectType || 'default'] || cascadeFountain;
    cascadeEffect({ data, onComplete });
};

