import { SoloCard } from "../../types/SoloTypes";
import { dealExplosion } from "./deal/dealExplosion";
import { dealFan } from "./deal/dealFan";
import { dealOpening } from "./deal/dealOpening";
import { dealSpiral } from "./deal/dealSpiral";
import { dealWave } from "./deal/dealWave";

type DealTimelinesMap = { [k: string]: { timeline: GSAPTimeline; cards: SoloCard[] } };

type DealEffectFn = (args: {
    timelines?: DealTimelinesMap;
    data: any;
    onComplete?: () => void;
}) => void;

export const dealEffect = ({
    effectType,
    data,
    onComplete,
    timelines,
}: {
    effectType?: string;
    data: any;
    onComplete?: () => void;
    timelines?: DealTimelinesMap;
}) => {
    const complete = () => {
        onComplete?.();
    };
    const effectMap: Record<string, DealEffectFn> = {
        default: dealFan,
        fan: dealFan,
        spiral: dealSpiral,
        wave: dealWave,
        explosion: dealExplosion,
        opening: dealOpening,
    };
    // Manual deal / PlayEffects default to fan; GameManager passes "opening" for first open.
    const playDealEffect = effectMap[effectType || "default"] ?? dealFan;

    playDealEffect({ timelines, data, onComplete: complete });
};
