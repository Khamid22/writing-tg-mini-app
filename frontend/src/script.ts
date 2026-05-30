export type UzbekScript = "latin" | "cyrillic";

const ORIGINAL_TEXT = new WeakMap<Text, string>();
const SCRIPT_LOCK_SELECTOR = [
  "[data-script-lock]",
  "input",
  "textarea",
  "select",
  "option",
  "code",
  "pre",
].join(",");

const LATIN_TO_CYRILLIC: Array<[RegExp, string]> = [
  [/yo/gi, "ё"],
  [/yu/gi, "ю"],
  [/ya/gi, "я"],
  [/sh/gi, "ш"],
  [/ch/gi, "ч"],
  [/g['ʻ‘’`]/gi, "ғ"],
  [/o['ʻ‘’`]/gi, "ў"],
  [/ng/gi, "нг"],
];

const CHAR_TO_CYRILLIC: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с",
  t: "т", u: "у", v: "в", x: "х", y: "й", z: "з",
  A: "А", B: "Б", D: "Д", E: "Е", F: "Ф", G: "Г", H: "Ҳ", I: "И", J: "Ж",
  K: "К", L: "Л", M: "М", N: "Н", O: "О", P: "П", Q: "Қ", R: "Р", S: "С",
  T: "Т", U: "У", V: "В", X: "Х", Y: "Й", Z: "З",
};

export function toUzbekScript(value: string, script: UzbekScript): string {
  if (script === "latin") return value;
  let output = value;
  for (const [pattern, replacement] of LATIN_TO_CYRILLIC) {
    output = output.replace(pattern, (match) => {
      const converted = replacement;
      return match[0] === match[0].toUpperCase() ? converted.toUpperCase() : converted;
    });
  }
  return output
    .replace(/[A-Za-z]/g, (char) => CHAR_TO_CYRILLIC[char] ?? char)
    .replace(/['ʻ‘’`]/g, "ъ");
}

export function applyScriptToElement(root: HTMLElement, script: UzbekScript): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue?.trim()) continue;

    const original = ORIGINAL_TEXT.get(node) ?? node.nodeValue;
    ORIGINAL_TEXT.set(node, original);

    if (parent.closest(SCRIPT_LOCK_SELECTOR)) {
      if (node.nodeValue !== original) node.nodeValue = original;
      continue;
    }

    const nextValue = toUzbekScript(original, script);
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  }
}

export function watchScriptElement(root: HTMLElement, script: UzbekScript): () => void {
  let frame = 0;
  const run = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => applyScriptToElement(root, script));
  };
  run();
  const observer = new MutationObserver(run);
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
