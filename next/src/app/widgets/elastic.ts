// Old: designer.browser.dev.js module 1715 (jQuery Elastic, $.fn.elastic).
/**
 * A textarea that grows with its text: a hidden twin div with the same
 * font, padding and border gets the text, and the textarea takes the
 * twin's height plus one line (between its own starting height and its
 * max-height). `<ElasticTextarea>` (elastic-view.tsx) renders one.
 */
import { computed, height, setHeight as jqSetHeight, width } from "../shell/dom.ts";

/**
 * $(el).height() / .width(): jQuery measured a display:none element by
 * showing it for a moment (absolute and hidden), which the twin needs.
 */
function measure(element: HTMLElement, read: (element: HTMLElement) => number): number {
  if (computed(element, "display") !== "none") return read(element);
  const style = element.style;
  const saved = [style.position, style.visibility, style.display];
  style.position = "absolute";
  style.visibility = "hidden";
  style.display = "block";
  const value = read(element);
  [style.position, style.visibility, style.display] = saved as [string, string, string];
  return value;
}

const jqHeight = (element: HTMLElement) => measure(element, height);
const jqWidth = (element: HTMLElement) => measure(element, width);

/** The styles the twin copies, in the order the old loop copied them (backwards). */
const MIMICS = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "width",
  "fontWeight",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "borderTopStyle",
  "borderTopColor",
  "borderRightStyle",
  "borderRightColor",
  "borderBottomStyle",
  "borderBottomColor",
  "borderLeftStyle",
  "borderLeftColor",
];

function cssName(name: string): string {
  return name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

/** The twin's markup for a text: escaped, double spaces kept, line breaks as <br />. */
export function twinMarkup(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/ {2}/g, "&nbsp;")
    .replace(/<|>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

/**
 * The height to give the textarea for a twin height, or null to leave it:
 * twin + one line, kept between the start height and max-height.
 */
export function elasticHeight(
  twinHeight: number,
  lineHeight: number,
  currentHeight: number,
  minHeight: number,
  maxHeight: number,
): { height: number; overflow: "auto" | "hidden" } | null {
  if (!(Math.abs(twinHeight + lineHeight - currentHeight) > 3)) return null;
  const goal = twinHeight + lineHeight;
  if (goal >= maxHeight) return { height: maxHeight, overflow: "auto" };
  return { height: goal <= minHeight ? minHeight : goal, overflow: "hidden" };
}

/** `$(textarea).elastic()`. Returns a function that removes the listeners and the twin. */
export function attachElastic(textarea: HTMLTextAreaElement): () => void {
  if ("textarea" !== textarea.type) return () => undefined;
  const twin = document.createElement("div");
  twin.style.position = "absolute";
  twin.style.display = "none";
  twin.style.setProperty("word-wrap", "break-word");
  twin.style.whiteSpace = "pre-wrap";
  const lineHeight =
    parseInt(computed(textarea, "line-height"), 10) ||
    parseInt(computed(textarea, "font-size"), 10);
  const minHeight = parseInt(computed(textarea, "height"), 10) || 3 * lineHeight;
  let maxHeight = parseInt(computed(textarea, "max-height"), 10) || Number.MAX_VALUE;
  if (maxHeight < 0) maxHeight = Number.MAX_VALUE;
  if (textarea.parentNode) textarea.parentNode.appendChild(twin);
  for (let i = MIMICS.length; i--;) {
    const name = cssName(MIMICS[i] as string);
    twin.style.setProperty(name, computed(textarea, name));
  }
  const setHeight = (value: number, overflow: string) => {
    const height = Math.floor(parseInt(String(value), 10));
    if (jqHeight(textarea) !== height) {
      textarea.style.height = height + "px";
      textarea.style.overflow = overflow;
    }
  };
  const update = (force?: boolean) => {
    const markup = twinMarkup(textarea.value);
    const current = twin.innerHTML.replace(/<br>/gi, "<br />");
    if (force || markup + "&nbsp;" !== current) {
      twin.innerHTML = markup + "&nbsp;";
      const next = elasticHeight(
        jqHeight(twin),
        lineHeight,
        jqHeight(textarea),
        minHeight,
        maxHeight,
      );
      if (next) setHeight(next.height, next.overflow);
    }
  };
  const resize = () => {
    const width = Math.floor(parseInt(String(jqWidth(textarea)), 10));
    if (jqWidth(twin) !== width) {
      twin.style.width = width + "px";
      update(true);
    }
  };
  const onKey = () => update();
  const onBlur = () => {
    const twinHeight = jqHeight(twin);
    if (twinHeight < maxHeight)
      jqSetHeight(textarea, twinHeight > minHeight ? twinHeight : minHeight);
  };
  const onInput = () => {
    setTimeout(update, 250);
  };
  textarea.style.overflow = "hidden";
  for (const type of ["keyup", "change", "cut", "paste"]) textarea.addEventListener(type, onKey);
  window.addEventListener("resize", resize);
  textarea.addEventListener("resize", resize);
  textarea.addEventListener("update", onKey);
  textarea.addEventListener("blur", onBlur);
  for (const type of ["input", "paste"]) textarea.addEventListener(type, onInput);
  update();
  return () => {
    for (const type of ["keyup", "change", "cut", "paste"])
      textarea.removeEventListener(type, onKey);
    window.removeEventListener("resize", resize);
    textarea.removeEventListener("resize", resize);
    textarea.removeEventListener("update", onKey);
    textarea.removeEventListener("blur", onBlur);
    for (const type of ["input", "paste"]) textarea.removeEventListener(type, onInput);
    twin.remove();
  };
}
