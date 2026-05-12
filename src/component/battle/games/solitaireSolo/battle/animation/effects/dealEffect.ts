
import { dealExplosion } from "./deal/dealExplosion";
import { dealFan } from "./deal/dealFan";
import { dealSpiral } from "./deal/dealSpiral";
import { dealWave } from "./deal/dealWave";

export const dealEffect = ({
    effectType,
    data,
    onComplete,
    timelines,
}: {
    effectType?: string;
    data: any;
    onComplete?: () => void;
    timelines?: { [k: string]: { timeline: GSAPTimeline; cards: unknown[] } };
}) => {
    const complete = () => {
        console.log("dealEffect callback complete");
        onComplete?.();
    };
    const effectMap: any = {
        default: dealFan,
        fan: dealFan,
        spiral: dealSpiral,
        wave: dealWave,
        explosion: dealExplosion,
    };
    const playDealEffect = effectMap[effectType || ("default" as keyof typeof effectMap)];

    playDealEffect({ timelines, data, onComplete: complete });
};