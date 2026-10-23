// Old: chunk.vendor.js module 118.
//
// The old code mixed a class with one throwing `destroy()` into canvases,
// paint contexts, the blender and the tile renderer; every user overrode it.
// An interface says the same without the dead default.

/** Something that holds canvases or GL resources and must be released. */
export interface Destroyable {
  destroy(): void;
}
