// Types and helpers shared by the graphics operators (graphics-*.ts).
import type { PSCore } from "../core.ts";
import type { PSPathSegment, PSPlainRecord, PSValue } from "../objects.ts";

/** A device-space point as path segments store it. */
export interface PathPoint {
  x: number;
  y: number;
}

/** The bounding box setbbox stores on the current path. */
export interface PathBBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** The current path: subpaths of segments, plus the bbox setbbox may set. */
export type PSPath = PSPathSegment[][] & { bbox?: PathBBox };

/** Something with a `value` (a PS object), read where the old code assumed one. */
export interface Valued {
  value: unknown;
}

/** The PSColor methods the graphics operators call, under their old names. */
export interface ColorHelper {
  imageColorCache: PSPlainRecord;
  imageColorCacheHit: number;
  imageColorCacheFail: number;
  getColorChannelsCount(colorSpace: PSValue[]): number;
  _getGColor(colorSpace: unknown, color: unknown): unknown;
  hsvToRGB(hsv: number[]): PSValue;
  imageColorProcess(
    values: number[],
    colorSpace: PSValue[],
    decode: number[],
    max: number,
  ): number[];
}

export function colorHelper(core: PSCore): ColorHelper {
  return core.color as unknown as ColorHelper;
}

export function currentPath(core: PSCore): PSPath {
  return core.gstate.path as PSPath;
}

/**
 * Whether a point falls outside the setbbox box. Sic: the last test is
 * `y < yMax` (not `y > yMax`), so almost every point inside a box fails.
 */
export function outsideBBox(point: PathPoint, box: PathBBox): boolean {
  return point.x < box.xMin || point.x > box.xMax || point.y < box.yMin || point.y < box.yMax;
}

/** `value` of a stack entry the old code read without checking its type. */
export function valueOf(entry: PSValue): unknown {
  return (entry as unknown as Valued).value;
}

/** The current point; null coordinates read as 0 in arithmetic, as before. */
export function positionX(core: PSCore): number {
  return core.gstate.position.x as number;
}

export function positionY(core: PSCore): number {
  return core.gstate.position.y as number;
}
