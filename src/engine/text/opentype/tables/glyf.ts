// Old: chunk.vendor.js module 725 (opentype.js tables/glyf.js).
// Gravit change: getPath adds explicit lineTo commands before each quadratic
// curve (see there), so TrueType paths have more commands than in opentype.js.

import * as check from "../check.ts";
import type { Font } from "../font.ts";
import type { Glyph, GlyphComponent, GlyphPoint } from "../glyph.ts";
import { GlyphSet, glyphLoader, ttfGlyphLoader } from "../glyphset.ts";
import { Parser } from "../parse.ts";
import { Path } from "../path.ts";

/** The affine part of a component, applied to its points. */
interface PointTransform {
  xScale: number;
  scale01: number;
  scale10: number;
  yScale: number;
  dx: number;
  dy: number;
}

/**
 * One coordinate, relative to the previous one. With the short bit set it is
 * one byte and the same bit gives the sign; otherwise the same bit repeats
 * the previous value or a signed 16-bit delta follows.
 */
function parseGlyphCoordinate(
  p: Parser,
  flag: number,
  previousValue: number,
  shortVectorBitMask: number,
  sameBitMask: number,
): number {
  let v: number;
  if ((flag & shortVectorBitMask) > 0) {
    v = p.parseByte();
    if ((flag & sameBitMask) === 0) {
      v = -v;
    }
    v = previousValue + v;
  } else {
    if ((flag & sameBitMask) > 0) {
      v = previousValue;
    } else {
      v = previousValue + p.parseShort();
    }
  }
  return v;
}

/** Reads a TrueType glyph's header, points or components and instructions into the glyph. */
function parseGlyph(glyph: Glyph, data: DataView, start: number): void {
  const p = new Parser(data, start);
  glyph.numberOfContours = p.parseShort();
  glyph._xMin = p.parseShort();
  glyph._yMin = p.parseShort();
  glyph._xMax = p.parseShort();
  glyph._yMax = p.parseShort();
  let flag: number;

  if (glyph.numberOfContours > 0) {
    // A simple glyph.
    const endPointIndices: number[] = (glyph.endPointIndices = []);
    for (let i = 0; i < glyph.numberOfContours; i += 1) {
      endPointIndices.push(p.parseUShort());
    }

    glyph.instructionLength = p.parseUShort();
    glyph.instructions = [];
    for (let i = 0; i < glyph.instructionLength; i += 1) {
      glyph.instructions.push(p.parseByte());
    }

    const numberOfCoordinates = (endPointIndices[endPointIndices.length - 1] as number) + 1;
    const pointFlags: number[] = [];
    for (let i = 0; i < numberOfCoordinates; i += 1) {
      flag = p.parseByte();
      pointFlags.push(flag);
      // Bit 3: repeat this flag n more times, n is the next byte.
      if ((flag & 8) > 0) {
        const repeatCount = p.parseByte();
        for (let j = 0; j < repeatCount; j += 1) {
          pointFlags.push(flag);
          i += 1;
        }
      }
    }

    check.argument(pointFlags.length === numberOfCoordinates, "Bad flags.");

    if (endPointIndices.length > 0) {
      const points: GlyphPoint[] = [];
      let point: GlyphPoint;
      // Coordinates are relative to the previous point, the first one to 0,0.
      if (numberOfCoordinates > 0) {
        for (let i = 0; i < numberOfCoordinates; i += 1) {
          flag = pointFlags[i] as number;
          point = {
            onCurve: !!(flag & 1),
            lastPointOfContour: endPointIndices.indexOf(i) >= 0,
          } as GlyphPoint;
          points.push(point);
        }

        let px = 0;
        for (let i = 0; i < numberOfCoordinates; i += 1) {
          flag = pointFlags[i] as number;
          point = points[i] as GlyphPoint;
          point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
          px = point.x;
        }

        let py = 0;
        for (let i = 0; i < numberOfCoordinates; i += 1) {
          flag = pointFlags[i] as number;
          point = points[i] as GlyphPoint;
          point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
          py = point.y;
        }
      }
      glyph.points = points;
    } else {
      glyph.points = [];
    }
  } else if (glyph.numberOfContours === 0) {
    glyph.points = [];
  } else {
    glyph.isComposite = true;
    glyph.points = [];
    glyph.components = [];
    let componentFlags = 0;
    let moreComponents = true;
    while (moreComponents) {
      componentFlags = p.parseUShort();
      const component: GlyphComponent = {
        glyphIndex: p.parseUShort(),
        xScale: 1,
        scale01: 0,
        scale10: 0,
        yScale: 1,
        dx: 0,
        dy: 0,
      };
      if ((componentFlags & 1) > 0) {
        // The arguments are words.
        if ((componentFlags & 2) > 0) {
          component.dx = p.parseShort();
          component.dy = p.parseShort();
        } else {
          component.matchedPoints = [p.parseUShort(), p.parseUShort()];
        }
      } else {
        // The arguments are bytes.
        if ((componentFlags & 2) > 0) {
          component.dx = p.parseChar();
          component.dy = p.parseChar();
        } else {
          component.matchedPoints = [p.parseByte(), p.parseByte()];
        }
      }

      if ((componentFlags & 8) > 0) {
        // One scale.
        component.xScale = component.yScale = p.parseF2Dot14();
      } else if ((componentFlags & 64) > 0) {
        // X and Y scale.
        component.xScale = p.parseF2Dot14();
        component.yScale = p.parseF2Dot14();
      } else if ((componentFlags & 128) > 0) {
        // A 2x2 transformation.
        component.xScale = p.parseF2Dot14();
        component.scale01 = p.parseF2Dot14();
        component.scale10 = p.parseF2Dot14();
        component.yScale = p.parseF2Dot14();
      }

      glyph.components.push(component);
      moreComponents = !!(componentFlags & 32);
    }
    if (componentFlags & 0x100) {
      // Instructions follow the last component.
      glyph.instructionLength = p.parseUShort();
      glyph.instructions = [];
      for (let i = 0; i < glyph.instructionLength; i += 1) {
        glyph.instructions.push(p.parseByte());
      }
    }
  }
}

/** Applies the transform to the points and returns new points. */
function transformPoints(points: GlyphPoint[], transform: PointTransform): GlyphPoint[] {
  const newPoints: GlyphPoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const pt = points[i] as GlyphPoint;
    newPoints.push({
      x: transform.xScale * pt.x + transform.scale01 * pt.y + transform.dx,
      y: transform.scale10 * pt.x + transform.yScale * pt.y + transform.dy,
      onCurve: pt.onCurve,
      lastPointOfContour: pt.lastPointOfContour,
    });
  }
  return newPoints;
}

function getContours(points: GlyphPoint[]): GlyphPoint[][] {
  const contours: GlyphPoint[][] = [];
  let currentContour: GlyphPoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const pt = points[i] as GlyphPoint;
    currentContour.push(pt);
    if (pt.lastPointOfContour) {
      contours.push(currentContour);
      currentContour = [];
    }
  }
  check.argument(
    currentContour.length === 0,
    "There are still points left in the current contour.",
  );
  return contours;
}

/** Converts TrueType points to a path. */
export function getPath(points: GlyphPoint[] | undefined): Path {
  const p = new Path();
  if (!points) {
    return p;
  }

  const contours = getContours(points);
  for (let contourIndex = 0; contourIndex < contours.length; ++contourIndex) {
    const contour = contours[contourIndex] as GlyphPoint[];

    let prev: GlyphPoint;
    let curr = contour[contour.length - 1] as GlyphPoint;
    let next = contour[0] as GlyphPoint;

    if (curr.onCurve) {
      p.moveTo(curr.x, curr.y);
    } else if (next.onCurve) {
      p.moveTo(next.x, next.y);
    } else {
      // Both first and last points are off-curve: start in their middle.
      const start = { x: 0.5 * (curr.x + next.x), y: 0.5 * (curr.y + next.y) };
      p.moveTo(start.x, start.y);
    }

    for (let i = 0; i < contour.length; ++i) {
      prev = curr;
      curr = next;
      next = contour[(i + 1) % contour.length] as GlyphPoint;

      if (curr.onCurve) {
        p.lineTo(curr.x, curr.y);
      } else {
        let prev2: { x: number; y: number } = prev;
        let next2: { x: number; y: number } = next;
        if (!prev.onCurve) {
          prev2 = { x: 0.5 * (curr.x + prev.x), y: 0.5 * (curr.y + prev.y) };
          // Gravit change: a line to the implied on-curve start point...
          p.lineTo(prev2.x, prev2.y);
        }
        if (!next.onCurve) {
          next2 = { x: 0.5 * (curr.x + next.x), y: 0.5 * (curr.y + next.y) };
        }
        // Gravit change: ...and always one more line to the curve's start
        // before the curve, so after an off-curve point that start appears twice.
        p.lineTo(prev2.x, prev2.y);
        p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
      }
    }
    p.closePath();
  }
  return p;
}

/** Builds the glyph's path; a composite glyph first collects its components' points. */
function buildPath(glyphs: GlyphSet, glyph: Glyph): Path {
  if (glyph.isComposite) {
    const components = glyph.components as GlyphComponent[];
    for (let j = 0; j < components.length; j += 1) {
      const component = components[j] as GlyphComponent;
      const componentGlyph = glyphs.get(component.glyphIndex) as Glyph;
      // Makes the loader parse the component glyph.
      componentGlyph.getPath();
      if (componentGlyph.points) {
        let transformedPoints: GlyphPoint[];
        const glyphPoints = glyph.points as GlyphPoint[];
        if (component.matchedPoints === undefined) {
          // Positioned by offset.
          transformedPoints = transformPoints(componentGlyph.points, component);
        } else {
          // Positioned by matched points.
          if (
            component.matchedPoints[0] > glyphPoints.length - 1 ||
            component.matchedPoints[1] > componentGlyph.points.length - 1
          ) {
            throw Error("Matched points out of range in " + glyph.name);
          }
          const firstPt = glyphPoints[component.matchedPoints[0]] as GlyphPoint;
          let secondPt = componentGlyph.points[component.matchedPoints[1]] as GlyphPoint;
          const transform: PointTransform = {
            xScale: component.xScale,
            scale01: component.scale01,
            scale10: component.scale10,
            yScale: component.yScale,
            dx: 0,
            dy: 0,
          };
          secondPt = transformPoints([secondPt], transform)[0] as GlyphPoint;
          transform.dx = firstPt.x - secondPt.x;
          transform.dy = firstPt.y - secondPt.y;
          transformedPoints = transformPoints(componentGlyph.points, transform);
        }
        glyph.points = glyphPoints.concat(transformedPoints);
      }
    }
  }
  return getPath(glyph.points);
}

/** Sets up a lazy loader per glyph from the loca offsets. The last loca entry only ends the last glyph. */
export function parse(data: DataView, start: number, loca: number[], font: Font): GlyphSet {
  const glyphs = new GlyphSet(font);
  for (let i = 0; i < loca.length - 1; i += 1) {
    const offset = loca[i] as number;
    const nextOffset = loca[i + 1] as number;
    if (offset !== nextOffset) {
      glyphs.push(i, ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
    } else {
      glyphs.push(i, glyphLoader(font, i));
    }
  }
  return glyphs;
}
