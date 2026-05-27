import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const telegramApp = window.Telegram?.WebApp;

function safeTelegramCall(action: () => void): void {
  try {
    action();
  } catch {
    // Some Telegram clients expose newer methods before they are usable.
  }
}

function usableViewportHeight(value: number | undefined): number | undefined {
  if (!value || value < 320) return undefined;
  return value;
}

function setTelegramViewportVars(): void {
  const latestTelegramApp = window.Telegram?.WebApp;
  const viewportHeight =
    usableViewportHeight(latestTelegramApp?.viewportHeight) ??
    usableViewportHeight(window.visualViewport?.height) ??
    window.innerHeight;
  const stableHeight = usableViewportHeight(latestTelegramApp?.viewportStableHeight) ?? viewportHeight;
  const safeArea = latestTelegramApp?.safeAreaInset ?? {};
  const contentSafeArea = latestTelegramApp?.contentSafeAreaInset ?? {};
  const root = document.documentElement;
  const topInset = Math.max(safeArea.top ?? 0, contentSafeArea.top ?? 0);
  const bottomInset = Math.max(safeArea.bottom ?? 0, contentSafeArea.bottom ?? 0);

  root.style.setProperty("--app-height", `${viewportHeight}px`);
  root.style.setProperty("--app-stable-height", `${stableHeight}px`);
  root.style.setProperty("--tg-safe-top", `${safeArea.top ?? 0}px`);
  root.style.setProperty("--tg-safe-bottom", `${safeArea.bottom ?? 0}px`);
  root.style.setProperty("--tg-content-safe-top", `${contentSafeArea.top ?? 0}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${contentSafeArea.bottom ?? 0}px`);
  root.style.setProperty("--tg-top-inset", `${topInset}px`);
  root.style.setProperty("--tg-bottom-inset", `${bottomInset}px`);
}

safeTelegramCall(() => telegramApp?.ready?.());
safeTelegramCall(() => telegramApp?.expand?.());
safeTelegramCall(() => telegramApp?.requestFullscreen?.());
safeTelegramCall(() => telegramApp?.disableVerticalSwipes?.());
safeTelegramCall(() => telegramApp?.enableClosingConfirmation?.());
safeTelegramCall(() => telegramApp?.setHeaderColor?.("#f3f3f2"));
safeTelegramCall(() => telegramApp?.setBackgroundColor?.("#f3f3f2"));
safeTelegramCall(() => telegramApp?.setBottomBarColor?.("#f3f3f2"));
setTelegramViewportVars();
safeTelegramCall(() => telegramApp?.onEvent?.("viewportChanged", setTelegramViewportVars));
safeTelegramCall(() => telegramApp?.onEvent?.("safeAreaChanged", setTelegramViewportVars));
safeTelegramCall(() => telegramApp?.onEvent?.("contentSafeAreaChanged", setTelegramViewportVars));
window.visualViewport?.addEventListener("resize", setTelegramViewportVars);
window.addEventListener("resize", setTelegramViewportVars);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
