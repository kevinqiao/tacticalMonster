
import { dealExplosion } from "./deal/dealExplosion";
import { dealFan } from "./deal/dealFan";
import { dealSpiral } from "./deal/dealSpiral";
import { dealWave } from "./deal/dealWave";

export const dealEffect = ({ effectType, data, onComplete }: { effectType?: string; data: any; onComplete?: () => void }) => {
    const effectMap: any = {
        'default': dealFan,
        'fan': dealFan,
        'spiral': dealSpiral,
        'wave': dealWave,
        'explosion': dealExplosion,
    };
    const dealEffect = effectMap[effectType || 'default' as keyof typeof effectMap];
    dealEffect({ data, onComplete });
}