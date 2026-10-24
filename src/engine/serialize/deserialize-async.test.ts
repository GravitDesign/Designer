import { describe, expect, it } from "vitest";
import { Container, type ContainerNode } from "../scene/node-container.ts";
import { Identity } from "../scene/node-identity.ts";
import { Properties } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { Node, registerNodeClass } from "../scene/node.ts";

class AsyncBranch extends Container(Identity(Store(Properties(Node)))) {
  static {
    registerNodeClass(this, "asyncbranch", "GTestAsyncBranch");
  }
  override validateInsertion(): boolean {
    return true;
  }
}

function deserializeAsync(json: string, progress?: (p: number) => void) {
  return new Promise<Node | Node[] | null>((resolve) => {
    Node.deserializeAsync(json, undefined, progress, null, resolve);
  });
}

function tree(depth: number, width: number): object {
  return depth === 0
    ? { "@": "asyncbranch" }
    : { "@": "asyncbranch", $: Array.from({ length: width }, () => tree(depth - 1, width)) };
}

const count = (node: Node): number =>
  1 + (node as ContainerNode).getChildren().reduce((sum, child) => sum + count(child), 0);

describe("deserializeAsync", () => {
  it("restores the same tree as deserialize, in order", async () => {
    const json = JSON.stringify(tree(3, 4));
    const progress: number[] = [];
    const node = (await deserializeAsync(json, (p) => progress.push(p))) as Node;
    expect(count(node)).toBe(1 + 4 + 16 + 64);
    expect(Node.serialize(node, { copy: true })).toBe(
      Node.serialize(Node.deserialize(json) as Node, { copy: true }),
    );
    expect(progress[0]).toBe(20);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("restores arrays and drops unknown nodes", async () => {
    const nodes = await deserializeAsync('[{"@":"asyncbranch"},{"@":"zzz"},{"@":"asyncbranch"}]');
    expect(Array.isArray(nodes) && nodes.length).toBe(2);
  });

  it("keeps children in blob order", async () => {
    const json = JSON.stringify({
      "@": "asyncbranch",
      $: [1, 2, 3].map((i) => ({ "@": "asyncbranch", "@id": "id000" + i })),
    });
    const node = (await deserializeAsync(json)) as AsyncBranch;
    expect(node.getChildren().map((c) => (c as AsyncBranch).getId())).toEqual([
      "id0001",
      "id0002",
      "id0003",
    ]);
  });
});
