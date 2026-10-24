import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncExecutor } from "./async-executor.ts";

afterEach(() => vi.restoreAllMocks());

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("AsyncExecutor", () => {
  it("runs nested lists depth first and calls done callbacks", async () => {
    const log: string[] = [];
    const finished = vi.fn();
    const executor = new AsyncExecutor(100, 1000, finished);
    executor.execute(
      [1, 2],
      (n) => {
        log.push("outer" + n);
        if (n === 1)
          executor.execute(
            ["a", "b"],
            (s) => log.push("inner" + s),
            () => log.push("inner done"),
          );
      },
      () => log.push("outer done"),
    );
    // The inner list runs right away; the outer one continues after a yield.
    expect(log).toEqual(["outer1", "innera", "innerb", "inner done"]);
    await flush();
    await flush();
    expect(log).toEqual(["outer1", "innera", "innerb", "inner done", "outer2", "outer done"]);
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it("yields once the time slice is used up", async () => {
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const seen: number[] = [];
    const executor = new AsyncExecutor(2, 10);
    executor.execute([1, 2, 3, 4, 5, 6], (n) => {
      seen.push(n);
      now += 6;
    });
    // The first slice ends at the constructor's Date.now() (old quirk), so
    // it stops after the first steps check (3 calls).
    expect(seen).toEqual([1, 2, 3]);
    await flush();
    expect(seen.length).toBeGreaterThan(3);
  });

  it("logs callback errors and keeps going, and stops on abort", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const seen: number[] = [];
    const executor = new AsyncExecutor(100, 1000);
    executor.execute([1, 2, 3], (n) => {
      if (n === 2) throw new Error("boom");
      seen.push(n);
    });
    expect(seen).toEqual([1, 3]);
    expect(error).toHaveBeenCalledTimes(1);
    executor.abort();
    expect(() => executor.execute([1], () => undefined)).toThrow("AbortError");
    await flush();
  });
});
