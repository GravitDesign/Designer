// Old: chunk.vendor.js module 750 (GSkewVerticalAnnotation, exported as its only instance).
import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class SkewVerticalAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.tranformBox.skew;
  }
}

export const SkewVerticalAnnotation = new SkewVerticalAnnotationHandle();
