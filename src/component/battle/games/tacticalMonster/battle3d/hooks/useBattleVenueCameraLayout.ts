import { useMemo, type CSSProperties } from "react";
import type { MapDimension } from "../../service/TeamDeployManager";
import { CAMERA_CONFIG, getViewportFitDistance, sphericalToPosition } from "../BattleCanvas3D";
import { getGridCenter3D, getGridExtent3D } from "../utils/coordinate3DUtils";

export function useBattleVenueCameraLayout(mapDimension: MapDimension | null) {
    const isPortrait = mapDimension?.isPortrait ?? false;

    const { cameraPosition, cameraTarget, minDistance, maxDistance, orthoZoom, cameraUp } = useMemo(() => {
        let target: [number, number, number] =
            (mapDimension && getGridCenter3D(mapDimension)) ?? [0, 0, 0];

        let position: [number, number, number];
        let minDist = 550;
        let maxDist = 1500;
        let zoom = mapDimension?.zoom ?? 1;
        let up: [number, number, number] | undefined;

        if (mapDimension) {
            if (mapDimension.isPortrait) {
                position = [target[0], 2000, target[2]];
                up = [1, 0, 0];
            } else {
                target = [target[0], target[1], target[2]];
                const extent = getGridExtent3D(mapDimension);
                const fitWidth = extent?.extentX ?? mapDimension.width;
                const fitHeight = extent?.extentZ ?? mapDimension.height;
                const fit = getViewportFitDistance(fitWidth, fitHeight, CAMERA_CONFIG.fov);
                minDist = fit.minDistance;
                maxDist = fit.maxDistance;
                const distance = fit.distance;
                position = sphericalToPosition(target, distance, CAMERA_CONFIG.azimuth, CAMERA_CONFIG.polar);
            }
        } else {
            position = [0, 10, 10];
        }

        return {
            cameraPosition: position,
            cameraTarget: target,
            minDistance: minDist,
            maxDistance: maxDist,
            orthoZoom: zoom,
            cameraUp: up,
        };
    }, [mapDimension]);

    const mapContainerStyle: CSSProperties = useMemo(() => {
        if (!mapDimension) return {};
        return {
            position: "absolute",
            top: `calc(50% - ${mapDimension.topOffset ?? 0}px)`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: mapDimension?.width,
            height: mapDimension?.height,
            backgroundColor: "transparent",
        };
    }, [mapDimension]);

    return {
        isPortrait,
        cameraPosition,
        cameraTarget,
        minDistance,
        maxDistance,
        orthoZoom,
        cameraUp,
        mapContainerStyle,
    };
}
