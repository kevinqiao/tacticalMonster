import "core-js/stable";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("__viteDynamicImportReloadDone");
    sessionStorage.removeItem("__viteDynamicImportReloadMetaV2");
  }
} catch {
  // ignore storage policy errors
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const showBootError = (title: string, error: unknown) => {
  const root = document.getElementById("root");
  if (!root || document.getElementById("__boot-error-overlay__")) return;
  const message = String((error as Error)?.stack || (error as Error)?.message || error || "Unknown error");
  root.innerHTML = `
    <div id="__boot-error-overlay__" style="height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;padding:16px;box-sizing:border-box;">
      <div style="max-width:960px;width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.4;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${escapeHtml(title)}</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;opacity:.9;">${escapeHtml(message)}</pre>
      </div>
    </div>
  `;
};

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element #root not found");
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  showBootError("Application bootstrap failed", error);
}

const scheduleIdle = (fn: () => void) => {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => fn(), { timeout: 3_000 });
  } else {
    setTimeout(fn, 1);
  }
};
scheduleIdle(() => {
  void import("./reportWebVitals").then((m) => m.default());
});

window.setTimeout(() => {
  document.getElementById("static-boot-cover")?.remove();
}, 15_000);
