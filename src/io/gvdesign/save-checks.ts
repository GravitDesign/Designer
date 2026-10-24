// Old: designer.browser.dev.js module 163 (hasPagesWithInfiniteEmptyCanvas),
// module 119 (the 507 refusal in performSave), module 237 (the storage
// item's size checks), module 447 (the linked-files check of GSaveAction).
/**
 * The checks around a save (FMT-GVD-014, FMT-GVD-015). They decide which
 * message the app shows; showing it is the app's part (phase 7).
 *
 * Which save runs which check in the old app:
 * - File > Download File / Save As for .gvdesign: none of the refusals;
 *   the storage item runs the size checks after writing.
 * - Saving to the cloud (performSave) and exporting to a non-native
 *   format refuse a document with an empty infinite page (code 507).
 * - Ctrl+S to a local file warns first when the scene links files.
 */
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { UN_BELIVEVABLE_FEW_BYTES_TO_SAVE, gzipJson } from "./format.ts";

/** The error code of a refused save of an empty infinite canvas. */
export const EMPTY_INFINITE_CANVAS_CODE = 507;

/** What performSave hands its fail callback for an empty infinite canvas. */
export interface EmptyInfiniteCanvasError {
  code: typeof EMPTY_INFINITE_CANVAS_CODE;
  /** GLocaleKey("GCommonNames", ...); the old key keeps its typo. */
  localeKey: { group: "GCommonNames"; key: "text.error-emtpy-infinite-canvas" };
  noFailCall: true;
}

/**
 * GDocument.hasPagesWithInfiniteEmptyCanvas: some page has no geometry
 * box, i.e. it is unbounded (w = h = 0) and holds nothing with geometry,
 * hidden or not. The old check asked for the visible box, which a hidden
 * page never has, so any hidden page blocked every export and Save As
 * (BUGS-FIXED.md "BUG-092 A hidden page blocks every export and Save
 * As").
 */
export function hasPagesWithInfiniteEmptyCanvas(scene: Scene): boolean {
  for (let child = scene.getFirstChild(); null !== child; child = child.getNext()) {
    if (child instanceof Page && !child.getGeometryBBox(true)) return true;
  }
  return false;
}

/** The refusal of performSave and the exports, or null to go ahead. */
export function checkEmptyInfiniteCanvas(scene: Scene): EmptyInfiniteCanvasError | null {
  if (!hasPagesWithInfiniteEmptyCanvas(scene)) return null;
  return {
    code: EMPTY_INFINITE_CANVAS_CODE,
    localeKey: { group: "GCommonNames", key: "text.error-emtpy-infinite-canvas" },
    noFailCall: true,
  };
}

/** GSaveAction: Ctrl+S to a local file asks first when this is true. */
export function needsLinkedFilesWarning(scene: Scene): boolean {
  return scene.hasLinkedFiles();
}

/**
 * Storage item _verifyFileNotTooSmall: a written file under 200 bytes
 * gets the "text.saveing-error" warning, unless the save counter measure
 * is on.
 */
export function isFileTooSmall(byteLength: number, counterMeasureEnabled = false): boolean {
  return byteLength < UN_BELIVEVABLE_FEW_BYTES_TO_SAVE && !counterMeasureEnabled;
}

/**
 * Storage item _verifyFileSizeAfterSaved: warns ("text.saveing-error")
 * when the file shrank to less than half its size before the save.
 */
export function hasFileShrunk(sizeBefore: number, sizeAfter: number): boolean {
  return !(sizeBefore < sizeAfter) && sizeBefore / 2 > sizeAfter && !!sizeAfter && sizeAfter > 0;
}

/**
 * Storage item getDocumentRealSizeAfterSave: serializes and gzips the
 * whole scene once more (save: true, singleton: false) only to learn the
 * file size; 0 when that fails. Like every save serialization it stamps
 * the scene's `lmd`.
 */
export function documentRealFileSize(scene: Scene): number {
  let json: string | null;
  try {
    json = Node.serialize(scene, { save: true, singleton: false });
  } catch (error) {
    console.error(error);
    return 0;
  }
  return null === json || "" === json ? 0 : gzipJson(json).length;
}
