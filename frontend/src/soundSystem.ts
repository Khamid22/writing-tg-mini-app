// Distinct, synthesized UI sounds (no audio assets, works offline). Each learning
// event gets its own tone/sequence instead of one generic click for everything.

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioContext ??= new Ctx();
    return audioContext;
  } catch {
    return null;
  }
}

type ToneSpec = { freq: number; start: number; duration: number; type?: OscillatorType; gain?: number };

function playTones(specs: ToneSpec[]): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const spec of specs) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = now + spec.start;
    const peak = spec.gain ?? 0.05;
    oscillator.type = spec.type ?? "sine";
    oscillator.frequency.setValueAtTime(spec.freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(t0);
    oscillator.stop(t0 + spec.duration + 0.02);
  }
}

export type SoundEvent = "tap" | "correct" | "wrong" | "learned" | "skip" | "complete";

export function playSound(event: SoundEvent): void {
  switch (event) {
    case "tap": // subtle click for generic buttons
      playTones([{ freq: 420, start: 0, duration: 0.045, gain: 0.025 }]);
      break;
    case "correct": // bright two-note rise
      playTones([
        { freq: 660, start: 0, duration: 0.09 },
        { freq: 990, start: 0.08, duration: 0.13 },
      ]);
      break;
    case "learned": // warmer, rewarding rise for a new word
      playTones([
        { freq: 587, start: 0, duration: 0.1 },
        { freq: 880, start: 0.09, duration: 0.17 },
      ]);
      break;
    case "wrong": // low, soft — not punishing
      playTones([{ freq: 196, start: 0, duration: 0.22, type: "triangle", gain: 0.045 }]);
      break;
    case "skip": // neutral short blip for "next/later"
      playTones([{ freq: 340, start: 0, duration: 0.06, gain: 0.03 }]);
      break;
    case "complete": // C-E-G chime for finishing a test
      playTones([
        { freq: 523, start: 0, duration: 0.12 },
        { freq: 659, start: 0.11, duration: 0.12 },
        { freq: 784, start: 0.22, duration: 0.2 },
      ]);
      break;
  }
}

export function playTapSound(): void {
  playSound("tap");
}
