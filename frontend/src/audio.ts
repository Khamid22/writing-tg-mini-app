import { fetchWordAudio } from "./api";

const CACHE_PREFIX = "audio:";
const NEGATIVE_MARKER = "__none__";
let activeAudio: HTMLAudioElement | null = null;

function readCache(wordId: number): string | null | undefined {
  const raw = localStorage.getItem(CACHE_PREFIX + wordId);
  if (raw === null) return undefined;
  return raw === NEGATIVE_MARKER ? null : raw;
}

function writeCache(wordId: number, url: string | null): void {
  localStorage.setItem(CACHE_PREFIX + wordId, url ?? NEGATIVE_MARKER);
}

/** Stop any audio currently playing (whether HTMLAudioElement or SpeechSynthesis). */
export function stopAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Pick the highest-quality available English voice. Online/Google/Daniel-style voices
 * sound much more natural than the default platform voice. */
function pickBestEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return null;

  const ranked = english.slice().sort((a, b) => score(b) - score(a));
  return ranked[0];

  function score(v: SpeechSynthesisVoice): number {
    let s = 0;
    if (!v.localService) s += 50; // network voices are usually higher quality
    if (/google|natural|enhanced|premium|neural/i.test(v.name)) s += 40;
    if (/daniel|samantha|karen|moira|tessa|fiona/i.test(v.name)) s += 20;
    if (v.lang === "en-GB") s += 5;
    if (v.lang === "en-US") s += 4;
    return s;
  }
}

function speakWithBestVoice(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const best = pickBestEnglishVoice();
  if (best) {
    utterance.voice = best;
    utterance.lang = best.lang;
  } else {
    utterance.lang = "en-GB";
  }
  utterance.rate = 0.92;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

/** Play the best available pronunciation for a word. Order of preference:
 *  1. Admin-provided URL on the word (word.audio_url)
 *  2. Resolved URL from /api/mini/words/{id}/audio (Cambridge / dictionaryapi.dev)
 *  3. Fallback: SpeechSynthesis with the highest-quality voice we can find */
export async function pronounceWord(args: {
  id: number;
  word: string;
  audioUrl: string | null;
}): Promise<void> {
  stopAudio();
  const { id, word, audioUrl } = args;

  let url: string | null | undefined = audioUrl || readCache(id);

  if (url === undefined) {
    try {
      const res = await fetchWordAudio(id);
      url = res.audio_url;
      writeCache(id, url);
    } catch {
      url = null;
    }
  }

  if (url) {
    try {
      const audio = new Audio(url);
      activeAudio = audio;
      await audio.play();
      return;
    } catch {
      activeAudio = null;
      // fall through to TTS
    }
  }
  speakWithBestVoice(word);
}

// Warm up the voice list — Chrome populates asynchronously
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
