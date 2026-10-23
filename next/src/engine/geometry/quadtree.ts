// Old: chunk.vendor.js module 140 (quadtree, no G name).

/** An axis-aligned box as the quadtree reads it. */
export interface QuadTreeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A box stored in the tree, with an optional payload. */
export class QuadTreeElement implements QuadTreeBounds {
  declare data: unknown;
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
  }
}
QuadTreeElement.prototype.data = null;

/**
 * A region quadtree over boxes. A node holds up to `max_objects` boxes;
 * past that (and above `max_levels`) it splits into four quadrants and
 * moves down every box that fits one of them entirely. Boxes that cross
 * a quadrant edge stay in the node.
 *
 * The order `retrieve` returns boxes in (this node's first, then the
 * quadrants 0..3) decides the order of hit tests, so it is kept exactly.
 */
export class QuadTree<T extends QuadTreeBounds = QuadTreeElement> {
  static Element = QuadTreeElement;
  /** retrieve(): only boxes fully inside the query box. */
  static RETRIEVE_MODE_FULLYCONTAINED = 1;
  /** retrieve(): only boxes that overlap the query box. */
  static RETRIEVE_MODE_INTERSECT = 2;

  max_objects: number;
  max_levels: number;
  level: number;
  bounds: QuadTreeBounds;
  objects: T[];
  /** The quadrants once split: bottom right, top right, bottom left, top left. */
  nodes: QuadTree<T>[] | null;

  constructor(bounds: QuadTreeBounds, maxObjects?: number, maxLevels?: number, level?: number) {
    this.max_objects = maxObjects || 10;
    this.max_levels = maxLevels || 4;
    this.level = level || 0;
    this.bounds = bounds;
    this.objects = [];
    this.nodes = null;
  }

  /** Creates the four quadrants, on rounded coordinates. */
  split(): void {
    const level = this.level + 1;
    const halfWidth = Math.round(0.5 * this.bounds.width);
    const halfHeight = Math.round(0.5 * this.bounds.height);
    const x = Math.round(this.bounds.x);
    const y = Math.round(this.bounds.y);
    const quadrant = (qx: number, qy: number): QuadTree<T> =>
      new QuadTree<T>(
        { x: qx, y: qy, width: halfWidth, height: halfHeight },
        this.max_objects,
        this.max_levels,
        level,
      );
    this.nodes = new Array<QuadTree<T>>(4);
    this.nodes[0] = quadrant(x + halfWidth, y + halfHeight);
    this.nodes[1] = quadrant(x + halfWidth, y);
    this.nodes[2] = quadrant(x, y + halfHeight);
    this.nodes[3] = quadrant(x, y);
  }

  /**
   * The quadrant `box` fits in entirely, or -1. The index is built from
   * two bits (top half: bit 0, left half: bit 1), measured against this
   * node's unrounded bounds.
   */
  getIndex(box: QuadTreeBounds): number {
    const midX = this.bounds.x + this.bounds.width / 2;
    const midY = this.bounds.y + this.bounds.height / 2;
    const top = box.y >= this.bounds.y && box.y + box.height < midY;
    const bottom = box.y >= midY && box.y + box.height <= this.bounds.y + this.bounds.height;
    const left = box.x >= this.bounds.x && box.x + box.width < midX;
    const right = box.x >= midX && box.x + box.width <= this.bounds.width + this.bounds.x;
    return (top || bottom) && (left || right) ? (Number(top) << 0) | (Number(left) << 1) : -1;
  }

  insert(box: T): void {
    let index: number;
    let i = 0;
    if (this.nodes && -1 !== (index = this.getIndex(box))) {
      (this.nodes[index] as QuadTree<T>).insert(box);
      return;
    }
    this.objects.push(box);
    if (this.objects.length > this.max_objects && this.level < this.max_levels) {
      if (!this.nodes) this.split();
      const nodes = this.nodes as unknown as QuadTree<T>[];
      while (i < this.objects.length) {
        index = this.getIndex(this.objects[i] as T);
        if (-1 !== index) {
          (nodes[index] as QuadTree<T>).insert(this.objects.splice(i, 1)[0] as T);
        } else {
          i += 1;
        }
      }
    }
  }

  /**
   * Removes `box` (by identity). Quadrants are merged back once all four
   * are empty leaves. True if the box was found.
   */
  remove(box: T): boolean {
    let index = this.objects.indexOf(box);
    let removed = false;
    if (index >= 0) {
      this.objects.splice(index, 1);
      removed = true;
    } else if (this.nodes) {
      if (-1 !== (index = this.getIndex(box))) {
        if ((removed = (this.nodes[index] as QuadTree<T>).remove(box))) {
          const [q0, q1, q2, q3] = this.nodes as [
            QuadTree<T>,
            QuadTree<T>,
            QuadTree<T>,
            QuadTree<T>,
          ];
          if (!(
            q0.nodes ||
            q1.nodes ||
            q2.nodes ||
            q3.nodes ||
            q0.objects.length ||
            q1.objects.length ||
            q2.objects.length ||
            q3.objects.length
          )) {
            this.nodes = null;
          }
        }
      }
    }
    return removed;
  }

  /**
   * The boxes that may overlap `box`: this node's (all of them, or
   * filtered by `mode`), then those of the quadrant `box` fits in, or of
   * every quadrant when it fits none. Without a mode the result can be
   * this node's own `objects` array.
   */
  retrieve(box: QuadTreeBounds, mode?: number): T[] {
    let found: T[] = null as unknown as T[];
    if (mode) {
      if (mode === QuadTree.RETRIEVE_MODE_INTERSECT) {
        found = this.objects.filter(
          (other) =>
            !(
              other.x >= box.x + box.width ||
              box.x >= other.x + other.width ||
              other.y >= box.y + box.height ||
              box.y >= other.y + other.height
            ),
        );
      } else if (mode === QuadTree.RETRIEVE_MODE_FULLYCONTAINED) {
        found = this.objects.filter(
          (other) =>
            other.x >= box.x &&
            other.y >= box.y &&
            other.x + other.width <= box.x + box.width &&
            other.y + other.height <= box.y + box.height,
        );
      }
    } else {
      found = this.objects;
    }
    // An unknown mode leaves `found` null, and concat on it throws, as
    // in the old code.
    if (this.nodes) {
      const index = this.getIndex(box);
      if (-1 !== index) {
        found = found.concat((this.nodes[index] as QuadTree<T>).retrieve(box, mode));
      } else {
        for (let i = 0; i < this.nodes.length; i++) {
          found = found.concat((this.nodes[i] as QuadTree<T>).retrieve(box, mode));
        }
      }
    }
    return found;
  }

  /**
   * Meant to empty the tree, but the old code read `nodes.length` before
   * checking `nodes`, so it throws on every leaf and therefore on every
   * tree (after emptying the objects up to the first leaf). Nothing in
   * the old app calls it; the port keeps the behaviour (QUESTIONS.md "Kept
   * crashes in the vertex helpers (getPathLength, GVertexContainer.clone,
   * QuadTree.clear)").
   */
  clear(): void {
    this.objects = [];
    const nodes = this.nodes as QuadTree<T>[];
    for (let i = 0; i < nodes.length; i++) {
      if (this.nodes) (this.nodes[i] as QuadTree<T>).clear();
    }
    this.nodes = null;
  }
}
