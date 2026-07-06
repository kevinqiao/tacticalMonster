import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/portal/solitaire";
const logs = [];
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}\n${err.stack ?? ""}`));
page.on("requestfailed", (req) => {
  errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ""}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(8000);

const snapshot = await page.evaluate(() => {
  const root = document.getElementById("root");
  const cover = document.getElementById("static-boot-cover");
  const bootErr = document.getElementById("__html-boot-error__");
  const portalShell = document.querySelector(".portal-route-shell");
  const portalPage = document.querySelector(".portal-page");
  return {
    title: document.title,
    pathname: location.pathname,
    rootChildCount: root?.children.length ?? -1,
    rootHTML: root?.innerHTML?.slice(0, 500) ?? "",
    coverVisible: cover ? getComputedStyle(cover).visibility : null,
    coverDisplay: cover ? getComputedStyle(cover).display : null,
    bootErr: bootErr?.textContent ?? null,
    portalShell: portalShell
      ? {
          bg: getComputedStyle(portalShell).backgroundColor,
          visibility: getComputedStyle(portalShell).visibility,
          opacity: getComputedStyle(portalShell).opacity,
        }
      : null,
    portalPage: portalPage
      ? {
          className: portalPage.className,
          bg: getComputedStyle(portalPage).backgroundColor,
        }
      : null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});

await page.screenshot({ path: "scripts/portal-probe.png", fullPage: true });
console.log(JSON.stringify({ url, snapshot, errors, logs: logs.slice(0, 40) }, null, 2));
await browser.close();
