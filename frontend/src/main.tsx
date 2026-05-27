import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const telegramApp = window.Telegram?.WebApp;

function setTelegramViewportVars(): void {
  const viewportHeight = telegramApp?.viewportHeight || window.visualViewport?.height || window.innerHeight;
  const stableHeight = telegramApp?.viewportStableHeight || viewportHeight;
  const safeArea = telegramApp?.safeAreaInset ?? {};
  const contentSafeArea = telegramApp?.contentSafeAreaInset ?? {};
  const root = document.documentElement;

  root.style.setProperty("--app-height", `${viewportHeight}px`);
  root.style.setProperty("--app-stable-height", `${stableHeight}px`);
  root.style.setProperty("--tg-safe-top", `${safeArea.top ?? 0}px`);
  root.style.setProperty("--tg-safe-bottom", `${safeArea.bottom ?? 0}px`);
  root.style.setProperty("--tg-content-safe-top", `${contentSafeArea.top ?? 0}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${contentSafeArea.bottom ?? 0}px`);
}

telegramApp?.ready?.();
telegramApp?.expand?.();
telegramApp?.requestFullscreen?.();
telegramApp?.disableVerticalSwipes?.();
telegramApp?.enableClosingConfirmation?.();
telegramApp?.setHeaderColor?.("#f3f3f2");
telegramApp?.setBackgroundColor?.("#f3f3f2");
telegramApp?.setBottomBarColor?.("#f3f3f2");
setTelegramViewportVars();
telegramApp?.onEvent?.("viewportChanged", setTelegramViewportVars);
window.visualViewport?.addEventListener("resize", setTelegramViewportVars);
window.addEventListener("resize", setTelegramViewportVars);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
