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
  const viewportHeight =
    usableViewportHeight(telegramApp?.viewportHeight) ??
    usableViewportHeight(window.visualViewport?.height) ??
    window.innerHeight;
  const stableHeight = usableViewportHeight(telegramApp?.viewportStableHeight) ?? viewportHeight;
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
window.visualViewport?.addEventListener("resize", setTelegramViewportVars);
window.addEventListener("resize", setTelegramViewportVars);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
