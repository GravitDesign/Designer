// Old: chunk.vendor.js module 542 (GRotateAnnotation, exported as its only instance).
import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class RotateAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.rotate;
  }
}

export const RotateAnnotation = new RotateAnnotationHandle();
