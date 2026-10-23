// Test support: drives the GTL document through undo and redo, the list
// repair filter, the failure paths of loading and splicing, the code
// lookup, list numbering and the default font meter, and returns plain
// data. The same function runs in the old app's page against the old
// modules (to record __fixtures__/old-gtl-document.json; the TypeScript
// types are stripped first) and against the port in document.test.ts, so
// it may only use what it is given and no imports.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface GtlDocumentProbeApi {
  /** GTLCore (old module 367) or TLCore. */
  TLCore: any;
  /** GTLCodes (module 920). */
  TLCodes: any;
  /** The default font meter (module 928). */
  defaultFontMeasure: any;
  /** A font manager with Open Sans Regular resolved as the default font. */
  fontManager: any;
}

export function probeGtlDocument(api: GtlDocumentProbeApi): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fm = api.fontManager;
  const C = api.TLCodes;

  const enc = (value: any, depth = 0): any => {
    if (typeof value === "number") {
      if (Object.is(value, -0)) return "-0";
      if (Number.isNaN(value)) return "NaN";
      if (value === Infinity) return "Inf";
      if (value === -Infinity) return "-Inf";
      return value;
    }
    if (value === undefined) return "undef";
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "function") return "fn";
    if (depth > 6) return "deep";
    if (Array.isArray(value)) return value.map((v) => enc(v, depth + 1));
    const result: Record<string, any> = {};
    for (const key in value) result[key] = enc(value[key], depth + 1);
    return result;
  };
  const attempt = (fn: () => any): any => {
    try {
      return enc(fn());
    } catch (e: any) {
      return "throws " + e.constructor.name;
    }
  };

  // Counts the rollbacks and errors the document logs while `fn` runs.
  const logged = (fn: () => any): any => {
    const savedError = console.error;
    const savedWarn = console.warn;
    const log = { rollbacks: 0, errors: [] as string[], warnings: 0 };
    console.error = (...args: any[]) => {
      if (String(args[0]).indexOf("rolling back") >= 0) log.rollbacks++;
      else log.errors.push(args[0] && args[0].constructor ? args[0].constructor.name : "?");
    };
    console.warn = () => {
      log.warnings++;
    };
    let result: any;
    try {
      result = fn();
    } catch (e: any) {
      result = "throws " + e.constructor.name;
    } finally {
      console.error = savedError;
      console.warn = savedWarn;
    }
    return { result, log };
  };

  const os = (extra: any) => Object.assign({ fontFamily: "Open Sans" }, extra);
  const make = (text: any): any => {
    const core = new api.TLCore();
    core.initialize(1, 1, fm, () => {});
    core.setWrap(true);
    core.setText(text);
    core.setWidth(220);
    return core;
  };
  const wordText = (word: any): any =>
    word && typeof word.plainText === "function" ? word.plainText() : "word:" + enc(word);
  const state = (core: any): any => {
    const doc = core._doc;
    return {
      words: doc.words.map(wordText),
      frame: !!doc.frame,
      plain: attempt(() => doc.documentRange().plainText()),
      saved: attempt(() => doc.save()),
      undo: doc.undo.length,
      redo: doc.redo.length,
    };
  };

  // -- Undo and redo (the inverse command gets the document as its start).
  const undo: Record<string, any> = {};
  const undoCase = (name: string, text: any, edit: (core: any) => any) => {
    try {
      const core = make(text);
      const steps: any[] = [state(core)];
      steps.push(
        logged(() => edit(core)),
        state(core),
      );
      steps.push(
        logged(() => core.undo()),
        state(core),
      );
      steps.push(
        logged(() => core.redo()),
        state(core),
      );
      steps.push(
        logged(() => core.undo()),
        state(core),
      );
      undo[name] = steps;
    } catch (e: any) {
      undo[name] = "throws " + e.constructor.name;
    }
  };
  undoCase("setText", [os({ text: "undo me now" })], (core) => core.getRange(0, 4).setText("re"));
  undoCase("setTextAtStart", [os({ text: "start here" })], (core) => {
    core.select(0, 0);
    core.insert("X");
  });
  undoCase("twoEdits", [os({ text: "one two three" })], (core) => {
    core.getRange(0, 3).setText("1");
    core.getRange(2, 5).setText("2");
  });
  undoCase("toggleList", "first\nsecond\nthird", (core) =>
    core.getDocumentRange().toggleList("Bullet"),
  );
  undoCase("toggleListOff", "a\nb", (core) => {
    core.getDocumentRange().toggleList("Number");
    return core.getDocumentRange().toggleList(null);
  });
  out.undo = undo;

  // -- The list repair filter after splicing list codes into plain text.
  const filters: Record<string, any> = {};
  const filterCase = (name: string, text: any, runs: any[], at = 5) => {
    try {
      const core = make(text);
      const result = logged(() => core._doc.splice(at, at, runs));
      filters[name] = [result, state(core)];
    } catch (e: any) {
      filters[name] = "throws " + e.constructor.name;
    }
  };
  filterCase("orphanListNext", "plain text here", [
    os({ text: { $: "ListNext" }, listMarker: "Bullet", listDepth: 0 }),
    os({ text: "item" }),
  ]);
  filterCase("strayListEnd", "plain text here", [os({ text: { $: "ListEnd" } })]);
  filterCase("unclosedListStart", "plain text here", [
    os({ text: { $: "ListStart" }, listMarker: "Number" }),
    os({ text: { $: "ListNext" }, listMarker: "Number", listDepth: 0 }),
    os({ text: "one" }),
  ]);
  filterCase("twoUnclosed", "plain text here", [
    os({ text: { $: "ListStart" }, listMarker: "Number" }),
    os({ text: { $: "ListNext" }, listMarker: "Number", listDepth: 0 }),
    os({ text: "one" }),
    os({ text: { $: "ListStart" }, listMarker: "Bullet" }),
    os({ text: { $: "ListNext" }, listMarker: "Bullet", listDepth: 1 }),
    os({ text: "two" }),
  ]);
  filterCase(
    "endAfterList",
    "a\nb\nc",
    [os({ text: { $: "ListEnd" } }), os({ text: { $: "ListEnd" } })],
    2,
  );
  out.filters = filters;

  // -- Codes that can't be measured or laid out.
  const failures: Record<string, any> = {};
  let armed = false;
  const fixedMeasure = () => ({
    width: 5,
    ascent: 5,
    descent: 1,
    minY: -5,
    maxY: 1,
    minX: 0,
    maxX: 5,
  });
  C.ProbeThrows = function (this: any) {
    this.measure = () => {
      throw new Error("probe measure");
    };
    this.draw = () => {};
  };
  C.ProbeNull = function (this: any) {
    this.measure = () => null;
    this.draw = () => {};
  };
  // An inline code that turns into a block code that can't lay out while armed.
  C.ProbeArmed = function (this: any) {
    this.measure = fixedMeasure;
    this.draw = () => {};
    if (armed) {
      this.block = () => {
        throw new Error("probe block");
      };
    }
  };
  try {
    for (const name of ["ProbeThrows", "ProbeNull"]) {
      const core = make([os({ text: "keep this" })]);
      const doc = core._doc;
      const loaded = logged(() => doc.load([os({ text: "a " }), os({ text: { $: name } })]));
      const afterLoad = state(core);
      const spliced = logged(() => doc.splice(2, 2, [os({ text: { $: name } })]));
      failures[name] = [loaded, afterLoad, spliced, state(core)];
    }
    {
      const core = make([
        os({ text: "one\ntwo " }),
        os({ text: { $: "ProbeArmed" } }),
        os({ text: "\nthree" }),
      ]);
      const doc = core._doc;
      const before = state(core);
      armed = true;
      const sane = logged(() => doc.checkSanity(0, 3, "x"));
      const listify = logged(() => core.getRange(0, 3).toggleList("Bullet"));
      armed = false;
      const afterListify = state(core);
      const listed = logged(() => core.getRange(0, 3).toggleList("Bullet"));
      const afterListed = state(core);
      armed = true;
      const unlistify = logged(() => core.getDocumentRange().toggleList(null));
      armed = false;
      failures.armed = [
        before,
        sane,
        listify,
        afterListify,
        listed,
        afterListed,
        unlistify,
        state(core),
      ];
    }
  } finally {
    delete C.ProbeThrows;
    delete C.ProbeNull;
    delete C.ProbeArmed;
  }
  out.failures = failures;

  // -- Code names the old lookup found on the GTLCodes function object.
  const names = [
    "Nope",
    "toString",
    "constructor",
    "call",
    "apply",
    "bind",
    "name",
    "length",
    "prototype",
    "caller",
    "arguments",
    "hasOwnProperty",
    "valueOf",
    "isPrototypeOf",
    "__proto__",
    "__defineGetter__",
    "editFilter",
    "codeFactory",
  ];
  out.codeNames = names.map((name) => {
    const factory = attempt(() => {
      const code = C.codeFactory({ $: name }, null, () => null);
      return code === null ? "null" : typeof code;
    });
    const core = make([os({ text: "before" })]);
    const loaded = logged(() => core._doc.load([os({ text: "x " }), os({ text: { $: name } })]));
    return [name, factory, loaded, state(core).plain];
  });

  // -- List numbering past the letter and roman tables.
  const markerData = (path: number[]) => ({
    node: { getDepth: () => path.length - 1 },
    pathNumber: path,
  });
  const paths = [
    [0, 23],
    [0, 24],
    [0, 25],
    [0, 26],
    [0, 49],
    [0, 50],
    [0, 74],
    [0, 75],
    [0, 0, 3],
    [0, 0, 8],
    [0, 0, 3998],
    [0, 0, 3999],
    [0, 0, 4000],
    [0, 0, 4998],
    [0, 0, 0, 4],
    [0, 0, 0, 0, 24],
    [0, 0, 0, 0, 25],
    [0, 0, 0, 0, 0, 3999],
    [5, 6, 7, 8, 9, 10, 11],
  ];
  out.numbering = paths.map((path) => [
    path,
    attempt(() => new C.Number({ $: "Number" }, markerData(path)).value),
    attempt(() => new C.RomanDot({ $: "RomanDot" }, markerData(path)).value),
    attempt(() => new C.RomanBracket({ $: "RomanBracket" }, markerData(path)).value),
  ]);

  // -- The default font meter.
  const meter = api.defaultFontMeasure;
  const savedManager = meter.fontManager;
  try {
    meter.fontManager = fm;
    const resolved = [
      ["AVA Ta", "font: 20px Open Sans"],
      ["Hello world", "color: red; font: italic bold 33px Open Sans; x: 1"],
      ["", "font: 12px Open Sans"],
    ].map(([text, style]) => attempt(() => meter(text, style)));
    meter.fontManager = { getDefaultFont: () => ({ isResolved: () => false }) };
    const unresolved = attempt(() => meter("AVA", "font: 20px Open Sans"));
    out.defaultMeter = { resolved, unresolved };
  } finally {
    meter.fontManager = savedManager;
  }
  return out;
}
