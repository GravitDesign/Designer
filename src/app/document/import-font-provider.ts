// Old: designer.browser.dev.js module 163 (the font provider J the SVG and
// Sketch importers get).
/**
 * Maps a font named in an imported file to the closest family the font
 * library has (FMT-IMPORT-028). It queries the fonts provider manager for
 * the font name, then for the family when nothing matched, and picks the
 * listed family with the smallest edit distance to the name; within it, the
 * font of the same style and weight, else its first font.
 *
 * The edit distance keeps the old Int8Array row, so distances above 127
 * wrap around (see "Import font matching wraps long edit distances" in
 * QUESTIONS.md).
 */
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { designer } from "../shell/globals.ts";
import { FontsProviderManager, type QueryResult } from "../fonts/font-manager.ts";
import type { ListedFamily } from "../fonts/fonts-provider.ts";

/** What the importers ask for. */
export interface ImportFontQuery {
  fontName?: string | null;
  fontFamily: string;
  fontStyle: string;
  fontWeight: number;
}

/** The chosen font. */
export interface ImportFontAnswer {
  family: string;
  weight: number;
  style: string;
}

/**
 * Levenshtein distance with the old branch-free minimum. The row is an
 * Int8Array like the old one.
 */
export function editDistance(first: string, second: string): number {
  let shorter = first;
  let longer = second;
  const firstLength = shorter.length;
  const secondLength = longer.length;
  if (0 === firstLength) return secondLength;
  if (0 === secondLength) return firstLength;
  if (firstLength > secondLength) {
    const swap = shorter;
    shorter = longer;
    longer = swap;
  }
  // The old code swapped the strings but kept the lengths it read before
  // (see "Import font matching wraps long edit distances" in QUESTIONS.md).
  const g = firstLength;
  const h = secondLength;
  const row = new Int8Array(g + 1);
  for (let i = 0; i <= g; i++) row[i] = i;
  for (let j = 1; j <= h; j++) {
    let previous = j;
    let current: number;
    const char = longer[j - 1];
    for (let i = 1; i <= g; i++) {
      if (char === shorter[i - 1]) current = row[i - 1] as number;
      else {
        const insert = previous + 1;
        const remove = (row[i] as number) + 1;
        const best = insert - ((insert - remove) & ((remove - insert) >> 7));
        const replace = (row[i - 1] as number) + 1;
        current = best - ((best - replace) & ((replace - best) >> 7));
      }
      row[i - 1] = previous;
      previous = current;
    }
    row[g] = previous;
  }
  return row[g] as number;
}

/** The answer for `query` among the listed families (the old inner function). */
export function pickFont(
  query: ImportFontQuery,
  faces: readonly ListedFamily[],
  defaultFamily: () => string,
): ImportFontAnswer | null {
  const firstFace = faces[0] as ListedFamily;
  const firstFont = firstFace.fonts[0] as ListedFamily["fonts"][number];
  const first = {
    family: firstFont.family || firstFace.family,
    weight: firstFont.weight,
    style: firstFont.style,
  };
  const wanted = query.fontName || query.fontFamily || defaultFamily();
  let bestDistance = editDistance(first.family, wanted);
  let bestIndex = 0;
  let bestFamily = first.family;
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i] as ListedFamily;
    let distance: number;
    if (face.families) {
      for (let k = 0; k < face.families.length; k++) {
        distance = editDistance(face.families[k] as string, wanted);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
          bestFamily = face.families[k] as string;
        }
      }
    } else {
      distance = editDistance(face.family, wanted);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
        bestFamily = face.family;
      }
    }
  }
  let answer: ImportFontAnswer | null = null;
  const chosen = faces[bestIndex] as ListedFamily;
  for (let k = 0; k < chosen.fonts.length; k++) {
    const font = chosen.fonts[k] as ListedFamily["fonts"][number];
    if (!font.family || font.family === bestFamily) {
      if (font.style === query.fontStyle && font.weight === query.fontWeight) {
        answer = { family: font.family || chosen.family, weight: font.weight, style: font.style };
        break;
      }
      if (!answer) {
        answer = { family: font.family || chosen.family, weight: font.weight, style: font.style };
      }
    }
  }
  return answer;
}

function defaultFamily(): string {
  const fonts = designer().getWorkspace().getFontManager() as FontManager;
  return (fonts.getDefaultFont() as { getFamily(): string }).getFamily();
}

type ImportFontCallback = (answer: ImportFontAnswer | null) => void;

/** Queries waiting for the one in flight to answer. */
const waiting: [ImportFontQuery, ImportFontCallback][] = [];
let inFlight = false;

/**
 * The provider the SVG and Sketch imports get as `fontProvider`.
 *
 * It asks the fonts provider manager one query at a time and takes one
 * answer per query: the manager drops the answer of a query that is
 * older than the latest one, and can answer a query twice, so
 * overlapping queries (one per family since BUG-072) could leave an
 * import waiting forever. The old app never overlapped them, because
 * every family waited for the first one's answer.
 */
export const importFontProvider = {
  queryFirst(query: ImportFontQuery, callback: ImportFontCallback): void {
    waiting.push([query, callback]);
    if (!inFlight) next();
  },
};

function next(): void {
  const item = waiting.shift();
  if (!item) {
    inFlight = false;
    return;
  }
  inFlight = true;
  const [query, callback] = item;
  ask(query, (answer) => {
    try {
      callback(answer);
    } finally {
      next();
    }
  });
}

/**
 * Looks the query up by font name, then by family. Only the first answer
 * to each lookup counts: the manager calls back a second time when a
 * provider disables itself during a load (its probe goes on to the next
 * provider twice), and that late answer would otherwise be taken for the
 * next query's.
 */
function ask(query: ImportFontQuery, callback: ImportFontCallback): void {
  const names: string[] = [];
  if (query.fontName) names.push(query.fontName);
  if (names.length) {
    if (names[0] !== query.fontFamily) names.push(query.fontFamily);
  } else names.push(query.fontFamily);
  let step = 0;
  let finished = false;
  const lookUp = (current: number): void => {
    FontsProviderManager.getInstance().query((result: QueryResult) => {
      if (finished || current !== step) return;
      if (result.faces.length) {
        finished = true;
        callback(pickFont(query, result.faces, defaultFamily));
      } else if (step < names.length - 1) {
        step++;
        setTimeout(() => lookUp(step));
      } else {
        finished = true;
        callback(null);
      }
    }, names[current] as string);
  };
  lookUp(0);
}
