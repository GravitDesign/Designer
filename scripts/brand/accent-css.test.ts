import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  accentCss,
  family,
  isAccent,
  mapAccent,
  mapValue,
  mayCoincide,
  parseCss,
  rebaseUrls,
  specificity,
  subjectOf,
} from "./accent-css.ts";
import { DEAD_CLASSES, DEAD_SELECTOR, THEMES, accentFile, generate } from "./gen-accent-css.ts";

const hex = (s: string) => ({
  r: parseInt(s.slice(1, 3), 16),
  g: parseInt(s.slice(3, 5), 16),
  b: parseInt(s.slice(5, 7), 16),
});

describe("accent colours", () => {
  it("turns the old pink into the brand magenta", () => {
    expect(mapAccent(hex("#d72e63"))).toEqual(hex("#e3136b"));
    expect(mapValue("1px solid #d72e63").value).toBe("1px solid #E3136B");
    expect(mapValue("rgba(215, 46, 99, 0.7)").value).toBe("rgba(227, 19, 107, 0.7)");
  });

  it("keeps lighter shades lighter and darker ones darker", () => {
    const light = mapAccent(hex("#df5983"));
    const dark = mapAccent(hex("#9c0734"));
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => r + g + b;
    expect(lum(light)).toBeGreaterThan(lum(hex("#e3136b")));
    expect(lum(dark)).toBeLessThan(lum(hex("#e3136b")));
  });

  it("leaves greys, plain reds, blues and the other brand colours alone", () => {
    for (const c of ["#4d4d4d", "#ff0000", "#ca4748", "#0094ff", "#584dbd", "#ffd81f", "#ffffff"])
      expect(isAccent(hex(c)), c).toBe(false);
    expect(mapValue("#fff #4d4d4d rgb(202,71,72)")).toEqual({
      value: "#fff #4d4d4d rgb(202,71,72)",
      changed: false,
    });
  });

  it("finds colours inside SVG data URIs", () => {
    expect(mapValue("url(\"data:image/svg+xml,%3Csvg fill='%23d72e63'/%3E\")").value).toBe(
      "url(\"data:image/svg+xml,%3Csvg fill='%23E3136B'/%3E\")",
    );
  });
});

describe("css parsing", () => {
  it("reads rules in order with their at-rule context, strings and comments intact", () => {
    const items = parseCss(
      '/* x */ a { color: red; background: url("a;b{}.svg") } @media (max-width: 5px) { .b > c { color: #d72e63 !important } }' +
        " @keyframes k { from { color: #d72e63 } } @font-face { font-family: x }",
    );
    expect(items.map((i) => (i.kind === "rule" ? [i.selector, i.context] : [i.prelude]))).toEqual([
      ["a", []],
      [".b > c", ["@media (max-width: 5px)"]],
      ["@keyframes k"],
      ["@font-face"],
    ]);
    const first = items[0];
    expect(first?.kind === "rule" && first.declarations[1]?.value).toBe('url("a;b{}.svg")');
    const second = items[1];
    expect(second?.kind === "rule" && second.declarations[0]).toEqual({
      prop: "color",
      value: "#d72e63",
      important: true,
    });
  });

  it("computes specificity", () => {
    expect(specificity("a")).toBe(1);
    expect(specificity(".a .b")).toBe(2000);
    expect(specificity("#x .a:hover::before")).toBe(1_002_001);
    expect(specificity("a:before")).toBe(2);
    expect(specificity('input[type="checkbox"]:checked')).toBe(2001);
    expect(specificity(".a:not(.b, #c)")).toBe(1_001_000);
    expect(specificity(":where(.a) b")).toBe(1);
  });

  it("knows which selectors can style the same box", () => {
    expect(mayCoincide(subjectOf(".a > div"), subjectOf(".b span"))).toBe(false);
    expect(mayCoincide(subjectOf(".a::before"), subjectOf(".a"))).toBe(false);
    expect(mayCoincide(subjectOf(".a:after"), subjectOf(".b::after"))).toBe(true);
    expect(mayCoincide(subjectOf('[type="radio"]'), subjectOf('input[type="checkbox"]'))).toBe(
      false,
    );
    expect(mayCoincide(subjectOf(".x .a"), subjectOf("div.b"))).toBe(true);
    expect(mayCoincide(subjectOf("#a"), subjectOf("#b"))).toBe(false);
    expect(family("-webkit-border-top-color")).toBe("border");
    expect(family("background-image")).toBe("background");
    expect(family("color")).toBe("color");
  });

  it("rebases relative URLs only", () => {
    expect(
      rebaseUrls(
        'url("assets/a.svg") url(b.png) url(/c.png) url(#d) url(data:x) url(%23e) url(http://f)',
        "../",
      ),
    ).toBe(
      'url("../assets/a.svg") url(../b.png) url(/c.png) url(#d) url(data:x) url(%23e) url(http://f)',
    );
  });
});

describe("the accent stylesheet keeps the old cascade", () => {
  it("restates an accent rule with the colour mapped", () => {
    expect(accentCss(".a .b { color: #d72e63; margin: 0 }").css).toBe(
      ".a .b {\n  color: #E3136B;\n}\n",
    );
  });

  it("also restates a later rule of the same specificity that beat the accent before", () => {
    // In the old sheet an element matching both is grey (the later rule
    // wins). Restating only the first rule would make it magenta.
    const css = accentCss(".a .b { color: #d72e63 } .c .b { color: #333 }").css;
    expect(css).toBe(".a .b {\n  color: #E3136B;\n}\n.c .b {\n  color: #333;\n}\n");
  });

  it("restates shorthands and longhands of a family together", () => {
    const css = accentCss(".a { border-color: #d72e63 } .b { border: 1px solid #ccc }").css;
    expect(css).toContain(".b {\n  border: 1px solid #ccc;\n}");
  });

  it("leaves out rules that can't compete", () => {
    const css = accentCss(
      ".a .b { color: #d72e63 } .c span::before { color: #333 } .d .e:hover { color: #333 }" +
        " .x .b { margin: 0 } .y .b { color: #444 !important } .e .f { background: #fff }",
    ).css;
    expect(css).toBe(".a .b {\n  color: #E3136B;\n}\n");
  });

  it("follows chains: a restated rule can need the next one too", () => {
    const css = accentCss(
      ".a .b { color: #d72e63 } .c .b { color: #333 } .x > div { color: #d72e63 } .q div { color: #111 } .c .d { color: #222 }",
    ).css;
    // .c .d shares (0,2,0) with the restated .c .b, so it is restated too.
    expect(css).toContain(".c .d {\n  color: #222;\n}");
    expect(css).toContain(".q div {\n  color: #111;\n}");
  });

  it("keeps importance apart", () => {
    const css = accentCss(".a { color: #d72e63 !important } .b { color: #333 }").css;
    expect(css).toBe(".a {\n  color: #E3136B !important;\n}\n");
  });

  it("restates keyframes with an accent whole, inside their at-rules", () => {
    const css = accentCss(
      "@media print { .a { fill: #d72e63 } } @keyframes k { to { color: #d72e63 } }",
    ).css;
    expect(css).toBe(
      "@media print {\n.a {\n  fill: #E3136B;\n}\n}\n@keyframes k { to { color: #E3136B } }\n",
    );
  });

  it("drops selectors only dropped features use", () => {
    const css = accentCss(".g-cloud-ui-x .a, .b { color: #d72e63 }", { dead: DEAD_SELECTOR }).css;
    expect(css).toBe(".b {\n  color: #E3136B;\n}\n");
  });
});

describe("public/brand/accent.<theme>.css", () => {
  it.each(THEMES)("%s is generated from the old stylesheet and up to date", (theme) => {
    // node scripts/brand/gen-accent-css.ts writes them.
    expect(fs.readFileSync(accentFile(theme), "utf8")).toBe(generate(theme).css);
  });

  it("maps the old accent in both themes", () => {
    for (const theme of THEMES) {
      const result = generate(theme);
      expect(result.colors.get("#d72e63 -> #E3136B")).toBeGreaterThan(190);
      expect(result.css).not.toMatch(/#d72e63/i);
    }
  });

  it("drops only classes the new app never renders", () => {
    const src = path.resolve(import.meta.dirname, "../../src");
    const files = fs
      .readdirSync(src, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
    for (const file of files) {
      const text = fs.readFileSync(path.join(src, file), "utf8");
      for (const name of DEAD_CLASSES) expect(text.includes(name), `${file}: ${name}`).toBe(false);
    }
  });
});
