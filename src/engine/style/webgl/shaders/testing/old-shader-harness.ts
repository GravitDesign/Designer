// Test helper: runs an old shader module from legacy/public/chunk.vendor.js next to
// its port and records what both do, so a test can compare them call for
// call. Neither touches WebGL: the shader base is replaced by a recorder
// that logs every program (its final GLSL sources), every pass
// (simpleShader with its uniforms and textures), texture binds, FXAA and
// default-shader draws.
//
// The old module is evaluated from the bundle at test time; nothing of it
// is copied into the new code.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { Shader } from "../../../../paint/webgl/shader.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../../../../../");

let bundleLines: string[] | null = null;
let moduleRanges: Map<number, [number, number]> | null = null;

/** The source text of vendor module `id` (a `function (e, t, i) {...}` expression). */
function moduleSource(id: number): string {
  if (!bundleLines) {
    bundleLines = fs
      .readFileSync(path.join(ROOT, "legacy/public/chunk.vendor.js"), "utf8")
      .split("\n");
    moduleRanges = new Map();
    const index = fs.readFileSync(path.join(ROOT, "docs/rewrite/old-module-index.tsv"), "utf8");
    for (const row of index.split("\n")) {
      const [bundle, module, lines] = row.split("\t");
      if (bundle !== "chunk.vendor.js" || !lines) continue;
      const [from, to] = lines.split("-").map(Number);
      moduleRanges.set(Number(module), [from as number, to as number]);
    }
  }
  const range = moduleRanges?.get(id);
  if (!range) throw new Error("no vendor module " + id);
  return bundleLines
    .slice(range[0] - 1, range[1])
    .join("\n")
    .trim()
    .replace(/,$/, "");
}

/** A logged call: what happened, then its arguments. */
export type LogEntry = unknown[];

/** Collects the calls of one run. Shaders and textures are named by first use. */
export class Recorder {
  log: LogEntry[] = [];
  private ids = new WeakMap<object, number>();
  private next = 0;

  private programs = 0;

  /** "shader#n (program#m)", shaders numbered in the order they first show up. */
  name(shader: object): string {
    let id = this.ids.get(shader);
    if (undefined === id) {
      id = this.next++;
      this.ids.set(shader, id);
    }
    const program = (shader as { program?: { label?: string } | null }).program;
    return "shader#" + id + " (" + (program && program.label ? program.label : "no program") + ")";
  }

  /** Logs a program with its sources; the token stands in for the WebGLProgram. */
  program(vertex: unknown, fragment: unknown): { label: string } {
    const label = "program#" + this.programs++;
    this.log.push(["program", label, vertex, fragment]);
    return { label };
  }
}

/** A stand-in for GLTexture that logs what is done with it. */
export class FakeTexture {
  constructor(
    readonly label: string,
    private readonly recorder: Recorder,
    public width: number,
    public height: number,
  ) {}

  use(...unit: unknown[]): void {
    this.recorder.log.push(["use", this.label, ...unit]);
  }

  unuse(...unit: unknown[]): void {
    this.recorder.log.push(["unuse", this.label, ...unit]);
  }

  ensureFormat(other: FakeTexture): void {
    this.recorder.log.push(["ensureFormat", this.label, other.label]);
  }

  drawTo(draw: (viewport: number[]) => void): void {
    this.recorder.log.push(["drawTo", this.label]);
    draw([0, 0, this.width, this.height]);
  }
}

/** The renderer a shader works for: its size and its three textures. */
export interface FakeHost {
  width: number;
  height: number;
  texture: FakeTexture;
  spareTexture: FakeTexture;
  extraTexture: FakeTexture;
  swirlBBox?: unknown;
}

export function createHost(
  recorder: Recorder,
  width: number,
  height: number,
  extra?: Partial<FakeHost>,
): FakeHost {
  return {
    width,
    height,
    texture: new FakeTexture("texture", recorder, width, height),
    spareTexture: new FakeTexture("spareTexture", recorder, width, height),
    extraTexture: new FakeTexture("extraTexture", recorder, width, height),
    ...extra,
  };
}

function textureLabel(texture: unknown): unknown {
  return texture instanceof FakeTexture ? texture.label : (texture ?? null);
}

/** The sources Shader's constructor completes (default vertex shader, precision prefix). */
function finalSources(vertex: string | null | undefined, fragment: string | null | undefined) {
  let captured: string[] = [];
  const spy = vi.spyOn(Shader, "getLinkedProgram").mockImplementation((v: string, f: string) => {
    captured = [v, f];
    return null;
  });
  new Shader(undefined, vertex, fragment);
  spy.mockRestore();
  return captured;
}

/** Logs the methods both shader bases share. */
function loggingMethods(recorder: Recorder) {
  return {
    simpleShader(this: object, uniforms: unknown, texture?: unknown, swapWith?: unknown): void {
      recorder.log.push([
        "simpleShader",
        recorder.name(this),
        uniforms,
        textureLabel(texture),
        textureLabel(swapWith),
      ]);
    },
    textures(this: object, units: unknown): object {
      recorder.log.push(["textures", recorder.name(this), units]);
      return this;
    },
    fxaa(this: object, ...args: unknown[]): void {
      recorder.log.push(["fxaa", recorder.name(this), ...args]);
    },
    destroy(this: object): void {
      recorder.log.push(["destroy", recorder.name(this)]);
    },
  };
}

function defaultShader(recorder: Recorder) {
  return {
    drawRect: (...args: unknown[]) => recorder.log.push(["defaultDrawRect", ...args]),
  };
}

type OldModuleFunction = (
  module: { exports: unknown },
  exports: unknown,
  require: (id: number) => unknown,
) => void;

/**
 * Loads old vendor module `id` with the shader base (module 42) replaced by
 * a recorder. Modules the shader requires (the blur, GObject.inherit, the
 * screen DPI) are resolved here.
 */
export function loadOldShader(id: number, recorder: Recorder, screenDPI = 1): unknown {
  const methods = loggingMethods(recorder);
  function OldShader(
    this: { glEffect: unknown; program: unknown },
    glEffect: unknown,
    vertex?: string,
    fragment?: string,
  ) {
    this.glEffect = glEffect;
    const [finalVertex, finalFragment] = finalSources(vertex, fragment);
    this.program = recorder.program(finalVertex, finalFragment);
  }
  Object.assign(OldShader.prototype, methods);
  Object.assign(OldShader, {
    randomShaderFunc: Shader.randomShaderFunc,
    TOLOCAL: Shader.TOLOCAL,
    sobelVertexShader: Shader.sobelVertexShader,
    tilingAwareVertexSource: Shader.tilingAwareVertexSource,
    screenSpaceDither: Shader.screenSpaceDither,
    dithering: Shader.dithering,
    warpShader: Shader.warpShader,
    clamp: Shader.clamp,
    getDefaultShader: () => defaultShader(recorder),
  });
  const cache = new Map<number, unknown>();
  const require = (moduleId: number): unknown => {
    if (42 === moduleId) return OldShader;
    if (0 === moduleId) {
      return {
        inherit(cls: { prototype: object }, base: { prototype: object }) {
          // GObject.inherit replaced the prototype, so the methods set
          // before the call were lost; the old modules set theirs after it,
          // except where noted in the ports.
          cls.prototype = Object.create(base.prototype) as object;
          (cls.prototype as { constructor: unknown }).constructor = cls;
        },
      };
    }
    if (14 === moduleId) return { getScreenDPI: () => screenDPI };
    let loaded = cache.get(moduleId);
    if (!loaded) {
      const module = { exports: {} as unknown };
      const factory = new Function(
        "return (" + moduleSource(moduleId) + ")",
      )() as OldModuleFunction;
      factory(module, module.exports, require);
      loaded = module.exports;
      cache.set(moduleId, loaded);
    }
    return loaded;
  };
  return require(id);
}

/** Replaces the new Shader base's GL work with the same logging. Returns the undo. */
export function recordNewShaders(recorder: Recorder): () => void {
  const methods = loggingMethods(recorder);
  const spies = [
    vi
      .spyOn(Shader, "getLinkedProgram")
      .mockImplementation(
        (vertex: string, fragment: string) =>
          recorder.program(vertex, fragment) as unknown as WebGLProgram,
      ),
    vi
      .spyOn(Shader, "getDefaultShader")
      .mockImplementation(() => defaultShader(recorder) as unknown as Shader),
    vi
      .spyOn(Shader.prototype, "simpleShader")
      .mockImplementation(methods.simpleShader as Shader["simpleShader"]),
    vi
      .spyOn(Shader.prototype, "textures")
      .mockImplementation(methods.textures as unknown as Shader["textures"]),
    vi.spyOn(Shader.prototype, "fxaa").mockImplementation(methods.fxaa as Shader["fxaa"]),
    vi.spyOn(Shader.prototype, "destroy").mockImplementation(methods.destroy as Shader["destroy"]),
  ];
  return () => spies.forEach((spy) => spy.mockRestore());
}

/** One render call: properties, scale and the tile (x, y, full width and height). */
export interface RenderCase {
  properties: Record<string, unknown>;
  scale?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Host texture size (default 64 x 48). */
  hostWidth?: number;
  hostHeight?: number;
  host?: Partial<FakeHost>;
  /** Builds the properties for each run instead (for values structuredClone drops, like methods). */
  makeProperties?: () => Record<string, unknown>;
  /** More arguments after the six (the angular shader's textures). */
  extra?: unknown[];
}

type RenderingInstance = {
  render(...args: unknown[]): void;
  destroy?(): void;
};

/**
 * Constructs the old shader and the port, renders each case with both and
 * destroys them, logging everything. Returns [old log, new log].
 */
export function compareShader(
  moduleId: number,
  NewShader: new (host: never) => object,
  cases: RenderCase[],
  screenDPI = 1,
): [LogEntry[], LogEntry[]] {
  const run = (
    create: (recorder: Recorder, host: FakeHost) => RenderingInstance,
    recorder: Recorder,
  ) => {
    for (const c of cases) {
      const host = createHost(recorder, c.hostWidth ?? 64, c.hostHeight ?? 48, c.host);
      recorder.log.push(["case"]);
      const shader = create(recorder, host);
      shader.render(
        c.makeProperties ? c.makeProperties() : structuredClone(c.properties),
        c.scale ?? 1,
        c.x ?? 0,
        c.y ?? 0,
        c.width ?? 64,
        c.height ?? 48,
        ...(c.extra ?? []).map((value) =>
          "string" == typeof value && value.startsWith("texture:")
            ? (host as unknown as Record<string, unknown>)[value.slice(8)]
            : value,
        ),
      );
      if (shader.destroy) shader.destroy();
    }
    return recorder.log;
  };
  const oldRecorder = new Recorder();
  const OldShader = loadOldShader(moduleId, oldRecorder, screenDPI) as new (
    host: FakeHost,
  ) => RenderingInstance;
  const oldLog = run((_recorder, host) => new OldShader(host), oldRecorder);
  const newRecorder = new Recorder();
  const undo = recordNewShaders(newRecorder);
  let newLog: LogEntry[];
  try {
    newLog = run(
      (_recorder, host) => new NewShader(host as never) as RenderingInstance,
      newRecorder,
    );
  } finally {
    undo();
  }
  return [oldLog, newLog];
}
