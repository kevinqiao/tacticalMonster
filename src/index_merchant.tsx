import "core-js/stable";
import React from "react";
import ReactDOM from "react-dom/client";
import "regenerator-runtime/runtime";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(<App module={"merchant"} />);
reportWebVitals();
