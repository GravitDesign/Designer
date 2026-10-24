// Old: designer.browser.dev.js module 1688 (GUtil.image2Canvas, GUtil.image2Base64).
/**
 * Draws an image onto a canvas of its natural size. A URL is loaded first
 * (cross-origin "Anonymous" for http(s) and protocol-relative URLs); the
 * canvas then only reaches the callback and the call returns null.
 */
export function image2Canvas(
  image: string | HTMLImageElement,
  callback?: (canvas: HTMLCanvasElement) => void,
): HTMLCanvasElement | null {
  if ("string" == typeof image) {
    const element = new Image();
    element.crossOrigin = image && image.match(/^(http|https|\/\/)/) ? "Anonymous" : null;
    element.src = image;
    element.onload = () => {
      image2Canvas(element, callback);
    };
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(image, 0, 0);
  if (callback) callback(canvas);
  return canvas;
}

/** The image as a PNG data URL: returned for an element, passed to the callback for both. */
export function image2Base64(
  image: string | HTMLImageElement,
  callback?: (dataUrl: string) => void,
): string | null {
  const canvas = image2Canvas(image, (drawn) => {
    if (callback) callback(drawn.toDataURL("image/png"));
  });
  return canvas ? canvas.toDataURL("image/png") : null;
}
