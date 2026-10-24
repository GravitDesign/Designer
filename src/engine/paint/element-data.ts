// Old: chunk.vendor.js module 112.

/** What a pixel hit test returns: the element that was hit and details. */
export class ElementData<E = unknown, D = unknown> {
  element: E;
  data: D;

  constructor(element: E, data: D) {
    this.element = element;
    this.data = data;
  }
}
