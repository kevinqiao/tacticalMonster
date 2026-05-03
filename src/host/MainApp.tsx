import React, { Suspense } from "react";
import RenderApp from "./RenderApp";
import RenderModal from "./RenderModal";
import SSOController from "./sso/SSOController";

/** 须在 PageProvider 内：RenderApp 路由依赖 PageManager Context */
export const MainApp: React.FC = () => {
    return (
        <>
            <Suspense fallback={null}>
                <RenderApp />
            </Suspense>
            <RenderModal />
            <SSOController />
        </>
    );
};
