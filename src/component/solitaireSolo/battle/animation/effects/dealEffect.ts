
import { SoloCard } from "../../types/SoloTypes";
import { dealExplosion } from "./deal/dealExplosion";
import { dealFan } from "./deal/dealFan";
import { dealSpiral } from "./deal/dealSpiral";
import { dealWave } from "./deal/dealWave";

export const dealEffect = ({ timelines, effectType, data, onComplete }: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, effectType?: string; data: any; onComplete?: () => void }) => {
    const complete = () => {
        console.log("dealEffect callback complete");
        onComplete?.();
    }
    const effectMap: any = {
        'default': dealFan,
        'fan': dealFan,
        'spiral': dealSpiral,
        'wave': dealWave,
        'explosion': dealExplosion,
    };
    const playDealEffect = effectMap[effectType || 'default' as keyof typeof effectMap];

    playDealEffect({ timelines, data, onComplete: complete });
}