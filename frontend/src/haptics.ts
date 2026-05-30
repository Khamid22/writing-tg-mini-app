// Telegram WebApp haptic feedback, wrapped so it's a no-op outside Telegram.
import type { HapticImpactStyle, HapticNotificationType } from "./types";

function feedback() {
  return window.Telegram?.WebApp?.HapticFeedback;
}

export function hapticImpact(style: HapticImpactStyle = "light"): void {
  try {
    feedback()?.impactOccurred?.(style);
  } catch {
    /* not running inside Telegram */
  }
}

export function hapticNotify(type: HapticNotificationType): void {
  try {
    feedback()?.notificationOccurred?.(type);
  } catch {
    /* not running inside Telegram */
  }
}

export function hapticSelection(): void {
  try {
    feedback()?.selectionChanged?.();
  } catch {
    /* not running inside Telegram */
  }
}
