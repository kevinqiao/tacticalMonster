import "./index.css";
import "core-js/stable";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);

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
