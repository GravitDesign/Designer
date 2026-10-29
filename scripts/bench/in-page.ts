// Code that runs in the app's page, installed with addInitScript before
// the app loads. It must not use anything from outside the function: it
// is sent to the page as source text.

export interface FrameRecord {
  /** Time between consecutive animation frames, ms. */
  frames: number[];
  /** Long tasks (over 50 ms) on the main thread while recording. */
  longTasks: number[];
  /** Wall time from start to stop, ms. */
  wall: number;
}

export interface RenderCount {
  commits: number;
  /** Component renders by component name. */
  byName: Record<string, number>;
}

export interface BenchWindow {
  __bench: {
    startFrames(): void;
    stopFrames(): FrameRecord;
    /** Resolves once the view has nothing left to paint for `quiet` frames in a row; ms waited. */
    idle(quiet?: number, timeout?: number): Promise<number>;
    nextFrame(): Promise<number>;
    renders: RenderCount;
    resetRenders(): void;
  };
}

export function installBench(options: { countRenders: boolean }): void {
  const w = window as unknown as Record<string, unknown>;

  let recording = false;
  let frames: number[] = [];
  let longTasks: number[] = [];
  let last = 0;
  let started = 0;
  const tick = (now: number): void => {
    if (!recording) return;
    if (last) frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  try {
    new PerformanceObserver((list) => {
      if (!recording) return;
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
  } catch {
    // no long task timing in this browser
  }

  type Parity = {
    app: {
      corpus: { viewIdle(): boolean; fontsReady(): boolean; assetsReady(): boolean };
    };
  };
  const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));

  const renders = { commits: 0, byName: {} as Record<string, number> };

  w.__bench = {
    startFrames(): void {
      frames = [];
      longTasks = [];
      last = 0;
      recording = true;
      started = performance.now();
      requestAnimationFrame(tick);
    },
    stopFrames(): { frames: number[]; longTasks: number[]; wall: number } {
      recording = false;
      return { frames, longTasks, wall: performance.now() - started };
    },
    async idle(quiet = 3, timeout = 120_000): Promise<number> {
      const start = performance.now();
      let calm = 0;
      while (calm < quiet) {
        if (performance.now() - start > timeout) throw new Error("bench idle: timed out");
        await frame();
        const p = (window as unknown as { __parity?: Parity }).__parity;
        const c = p && p.app.corpus;
        // assetsReady walks the whole scene, which on tens of thousands
        // of objects takes longer than a frame. Images and textures only
        // turn ready while waiting, never back, so it is asked once, when
        // the view and the fonts have been quiet for `quiet` frames.
        if (c && c.viewIdle() && c.fontsReady()) {
          calm++;
          if (calm >= quiet && !c.assetsReady()) calm = 0;
        } else calm = 0;
      }
      return performance.now() - start;
    },
    nextFrame: frame,
    renders,
    resetRenders(): void {
      renders.commits = 0;
      renders.byName = {};
    },
  };

  if (!options.countRenders) return;

  // A minimal React DevTools hook: React calls onCommitFiberRoot after
  // every commit, in production builds too. A component rendered in a
  // commit when its fiber object is new in the tree (React swaps the two
  // copies of a fiber when it works on it) and has the PerformedWork flag.
  // Fibers React skipped keep their old object and their old flags.
  const seenByRoot = new WeakMap<object, WeakSet<object>>();
  type Fiber = {
    tag: number;
    flags: number;
    type: unknown;
    child: Fiber | null;
    sibling: Fiber | null;
  };
  const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);
  const nameOf = (type: unknown): string => {
    if (!type) return "?";
    if (typeof type === "function") {
      const f = type as { displayName?: string; name?: string };
      return f.displayName || f.name || "anonymous";
    }
    if (typeof type === "object") {
      const t = type as { displayName?: string; render?: unknown; type?: unknown };
      if (t.displayName) return t.displayName;
      if (t.render) return nameOf(t.render);
      if (t.type) return nameOf(t.type);
    }
    return String(type);
  };
  let rendererId = 0;
  w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject(): number {
      return ++rendererId;
    },
    checkDCE(): void {},
    onScheduleFiberRoot(): void {},
    onCommitFiberUnmount(): void {},
    onPostCommitFiberRoot(): void {},
    onCommitFiberRoot(_id: number, root: { current: Fiber }): void {
      renders.commits++;
      const seen = seenByRoot.get(root) ?? new WeakSet<object>();
      const next = new WeakSet<object>();
      const stack: Fiber[] = [root.current];
      while (stack.length) {
        const fiber = stack.pop() as Fiber;
        next.add(fiber);
        if (COMPONENT_TAGS.has(fiber.tag) && !seen.has(fiber) && fiber.flags & 1) {
          const name = nameOf(fiber.type);
          renders.byName[name] = (renders.byName[name] ?? 0) + 1;
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        if (fiber.child) stack.push(fiber.child);
      }
      seenByRoot.set(root, next);
    },
  };
}
