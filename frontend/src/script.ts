export type UzbekScript = "latin" | "cyrillic";

const LATIN_TO_CYRILLIC: Array<[RegExp, string]> = [
  [/yo/gi, "ё"],
  [/yu/gi, "ю"],
  [/ya/gi, "я"],
  [/sh/gi, "ш"],
  [/ch/gi, "ч"],
  [/g'/gi, "ғ"],
  [/o'/gi, "ў"],
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
    .replace(/['ʼ]/g, "ъ");
}
