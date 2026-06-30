import "@/i18n";
import React from "react";
import { AppProviders } from "./AppProviders";
import { MainApp } from "./MainApp";
import { useAppPerformanceMonitor } from "./useAppPerformanceMonitor";

// GSAP 在 RenderApp 等模块注册 CSSPlugin

export const ApplicationRoot: React.FC = () => {
    useAppPerformanceMonitor();

    return (
        <AppProviders>
            <MainApp />
        </AppProviders>
    );
};
