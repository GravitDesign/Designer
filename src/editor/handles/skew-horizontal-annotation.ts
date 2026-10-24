// Old: chunk.vendor.js module 749 (GSkewHorizontalAnnotation, exported as its only instance).
import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class SkewHorizontalAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.tranformBox.skew;
  }
}

export const SkewHorizontalAnnotation = new SkewHorizontalAnnotationHandle();
