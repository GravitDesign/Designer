import { describe, expect, it } from "vitest";
import { getWorkspaceClass } from "../style/late-bound.ts";
import { FontManager } from "../text/fonts/font-manager.ts";
import { TransactionRecorder } from "../undo/transaction-recorder.ts";
import { Page } from "./page.ts";
import { Scene } from "./scene.ts";
import { ResolveUrlEvent, Workspace } from "./workspace.ts";

describe("Workspace", () => {
  it("owns a font manager and a recorder, and registers itself for the style code", () => {
    const workspace = new Workspace();
    expect(workspace.getFontManager()).toBeInstanceOf(FontManager);
    expect(workspace.getTransactionRecorder()).toBeInstanceOf(TransactionRecorder);
    expect(getWorkspaceClass()).toBe(Workspace);
  });

  it("gives a node whose reference id is taken a new id and keeps the old one", () => {
    const workspace = new Workspace();
    const first = new Page();
    const second = new Page();
    second._referenceId = first.getReferenceId();
    workspace.addReference(first);
    workspace.addReference(second);
    expect(second.getOldReferenceId()).toBe(first.getReferenceId());
    expect(second.getReferenceId()).not.toBe(first.getReferenceId());
    expect(workspace.getReference(second.getReferenceId())).toBe(second);
    expect(workspace.getReference(first.getReferenceId())).toBe(first);
  });

  it("throws when removing a reference it doesn't have", () => {
    expect(() => new Workspace().removeReference(new Page())).toThrow("Reference not yet added.");
  });

  it("forgets the references of a closed scene only", () => {
    const workspace = new Workspace();
    const scene = new Scene(workspace);
    const other = new Scene(workspace);
    const page = scene.getActivePage() as Page;
    const otherPage = other.getActivePage() as Page;
    workspace.cleanReferences(scene);
    expect(workspace.getReference(page.getReferenceId())).toBeNull();
    expect(workspace.getReference(otherPage.getReferenceId())).toBe(otherPage);
  });

  it("resolves data and http urls directly and asks for the rest", () => {
    const workspace = new Workspace();
    const resolved: string[] = [];
    workspace.resolveUrl("data:image/png;base64,AA", (url) => resolved.push(url), null);
    workspace.resolveUrl("https://example.com/a.png", (url) => resolved.push(url), null);
    // Nobody listens: nothing happens.
    workspace.resolveUrl("dictionary://abc", (url) => resolved.push(url), null);
    expect(resolved).toEqual(["data:image/png;base64,AA", "https://example.com/a.png"]);
    const asked: (string | null)[] = [];
    workspace.addEventListener(ResolveUrlEvent, (event: ResolveUrlEvent) => {
      asked.push(event.url);
      event.resolved?.("resolved:" + String(event.url));
    });
    workspace.resolveUrl("dictionary://abc", (url) => resolved.push(url), null);
    expect(asked).toEqual(["dictionary://abc"]);
    expect(resolved[2]).toBe("resolved:dictionary://abc");
  });

  it("accepts images without counting them and unknown values never", () => {
    const workspace = new Workspace();
    expect(workspace.increaseMemoryForImage(null)).toBe(true);
    // No canvas or image element in the node test environment.
    expect(workspace.increaseMemoryForImage({ width: 10, height: 10 })).toBe(false);
    expect(workspace._memory).toBe(0);
  });
});
