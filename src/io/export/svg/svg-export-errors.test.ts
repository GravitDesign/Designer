// SVG exports that hit a painting problem: a broken image, and a node
// whose paint throws.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { SvgExport } from "./svg-export.ts";

let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
});

afterAll(() => uninstall());

afterEach(() => {
  vi.restoreAllMocks();
});

function pageWith(node: Image): ReturnType<Scene["getActivePage"]> {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>;
  page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, 100, 100]);
  page.appendChild(node);
  return page;
}

function exportPage(page: ReturnType<Scene["getActivePage"]>): unknown[][] {
  const calls: unknown[][] = [];
  SvgExport.export(page as never, { decimalPlacesPrecision: 3 }, (...args: unknown[]) =>
    calls.push(args),
  );
  return calls;
}

function brokenImage(): Image {
  const image = new Image();
  image.setProperties(["iw", "ih", "url"], [4, 4, "data:image/png;base64,AAAA"]);
  image.transform(new Transform(10, 0, 0, 10, 20, 20));
  (image as unknown as { _status: number })._status = Image.ImageStatus.Error;
  return image;
}

describe("BUG-086: SVG export problems", () => {
  it("exports a broken image with its error cross", () => {
    const calls = exportPage(pageWith(brokenImage()));
    expect(calls).toHaveLength(1);
    const [error, svg] = calls[0] as [unknown, string];
    expect(error).toBeFalsy();
    // The two strokes of the cross.
    expect(svg.match(/<path [^>]*d="M [^"]* L [^"]*"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("calls back with the error when painting a node throws", () => {
    vi.spyOn(SvgExport, "renderNode").mockImplementation(() => {
      throw new Error("paint failed");
    });
    const calls = exportPage(pageWith(brokenImage()));
    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.[0])).toContain("paint failed");
  });
});
