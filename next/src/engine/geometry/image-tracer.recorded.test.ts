// imagedataToTracedata on seeded random small images and options (fixed
// palettes, sampled and generated palettes, blur, pathomit, ltres/qtres,
// quantization cycles), plus tracepath2 on the internodes of each image,
// against the outputs of the old module 1003 recorded once in
// image-tracer.recorded.json: the trace data, the options object as the
// tracer left it, the generator state and the thrown errors. The
// recording script lives outside the repo.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ImageTracer, type TracerOptions } from "./image-tracer.ts";

interface RecordedTrace {
  input: {
    w: number;
    h: number;
    data: number[];
    opts: TracerOptions & { numberofcolors?: number };
  };
  out: { ok?: unknown; err?: string; msg?: string };
}

const fixture = JSON.parse(
  readFileSync(new URL("./image-tracer.recorded.json", import.meta.url), "utf8"),
) as { cases: RecordedTrace[] };

function run({ input }: RecordedTrace): RecordedTrace["out"] {
  const image = () => ({
    width: input.w,
    height: input.h,
    data: Uint8ClampedArray.from(input.data),
  });
  try {
    const tracer = new ImageTracer();
    const options = structuredClone(input.opts);
    const trace = tracer.imagedataToTracedata(image(), options);
    const second = new ImageTracer();
    const checked = second.checkoptions({ numberofcolors: input.opts.numberofcolors ?? 4 });
    const indexed = second.colorquantization(image(), checked);
    const internodes = second.batchinternodes(second.batchpathscan(second.layering(indexed), 0));
    const curves = internodes.map((layer) =>
      layer.map((path) => {
        try {
          return second.tracepath2(path);
        } catch (error) {
          const e = error as Error;
          return "T2THROW " + e.constructor.name + " " + e.message;
        }
      }),
    );
    // Through JSON like the recording: drops undefined fields.
    return {
      ok: JSON.parse(JSON.stringify([trace, options, curves, tracer._m_w, tracer._m_z])) as unknown,
    };
  } catch (error) {
    const e = error as Error;
    return { err: e.constructor.name, msg: e.message };
  }
}

describe("ImageTracer against recorded old outputs", () => {
  // blur() makes its output through a canvas; Node has none, so hand it
  // the ImageData shape it asks for (as the recording did).
  beforeAll(() => {
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => ({
          createImageData: (like: { width: number; height: number }) => ({
            width: like.width,
            height: like.height,
            data: new Uint8ClampedArray(like.width * like.height * 4),
          }),
        }),
      }),
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it(`matches ${fixture.cases.length} recorded traces`, () => {
    for (const [index, c] of fixture.cases.entries()) {
      const { data, ...rest } = c.input;
      void data;
      expect(run(c), `case ${index}: ${JSON.stringify(rest)}`).toEqual(c.out);
    }
  });

  it("throws on colorquantcycles 0 and numberofcolors 0 like the old code", () => {
    const white = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
    expect(() => new ImageTracer().imagedataToTracedata(white, { colorquantcycles: 0 })).toThrow(
      "Cannot read properties of undefined (reading '2')",
    );
    expect(() => new ImageTracer().imagedataToTracedata(white, { numberofcolors: 0 })).toThrow(
      "Cannot read properties of undefined (reading 'r')",
    );
  });
});
