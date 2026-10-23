import { afterEach, describe, expect, it } from "vitest";
import { clearOverlays, openOverlay, openOverlayKeys, useOverlayStore } from "./overlay-store.tsx";

afterEach(() => clearOverlays());

describe("openOverlay", () => {
  it("keeps overlays in open order and removes them on close", () => {
    let closed = 0;
    const a = openOverlay({ key: "a", render: () => null, onClosed: () => closed++ });
    const b = openOverlay({ key: "b", render: () => null });
    expect(openOverlayKeys()).toEqual(["a", "b"]);
    a.close();
    a.close();
    expect(closed).toBe(1);
    expect(a.isOpen()).toBe(false);
    expect(openOverlayKeys()).toEqual(["b"]);
    expect(b.isOpen()).toBe(true);
  });

  it("re-renders an entry on update without reordering", () => {
    const a = openOverlay({ key: "a", render: () => null });
    openOverlay({ key: "b", render: () => null });
    const before = useOverlayStore.getState().overlays[0];
    a.update();
    const after = useOverlayStore.getState().overlays[0];
    expect(after?.key).toBe("a");
    expect(after).not.toBe(before);
    expect(openOverlayKeys()).toEqual(["a", "b"]);
  });
});
