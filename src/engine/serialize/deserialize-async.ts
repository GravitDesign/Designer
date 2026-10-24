// Old: chunk.vendor.js module 894 (GNode.deserializeAsync).
/**
 * Restores a document in time slices (AsyncExecutor, 15 ms per slice), so
 * a big file doesn't freeze the page. Same steps as Node.deserialize, with
 * every list of children handed to the executor.
 *
 * Installed on Node by node.ts, like the old `require(894)(GNode)`.
 */
import { AsyncExecutor } from "../core/async-executor.ts";
import type { Node } from "../scene/node.ts";
import type { NodeBlob, ProgressCallback } from "./blob.ts";

type Restored = ((node: Node) => void) | null | undefined;

export interface DeserializeAsync {
  /**
   * Like Node.deserialize, but `done` gets the result once everything is
   * restored. As in the old code, `done` is never called for empty or
   * invalid JSON.
   */
  deserializeAsync(
    json: string | null | undefined,
    constructorArg: unknown,
    progress: ProgressCallback | null | undefined,
    onRestored: Restored,
    done: (nodes: Node | Node[] | null) => void,
  ): void;
  _restoreAsync(
    executor: AsyncExecutor,
    blob: NodeBlob,
    constructorArg: unknown,
    onRestored: Restored,
    progress: ProgressCallback | null | undefined,
    total: number | null | undefined,
    done: (node: Node | null) => void,
  ): void;
}

export function installDeserializeAsync(NodeClass: typeof Node): void {
  const restoreAsync: DeserializeAsync["_restoreAsync"] = (
    executor,
    blob,
    constructorArg,
    onRestored,
    progress,
    total,
    done,
  ) => {
    NodeClass._restore(
      blob,
      constructorArg,
      onRestored,
      progress,
      total,
      (restoredBlob, node, restored, prog, count, finish) => {
        NodeClass._restoreInstance(
          restoredBlob,
          node,
          restored,
          prog,
          count,
          (parent, children, childArg, childRestored, childProgress, childTotal, childrenDone) => {
            executor.execute(
              children,
              (child) => {
                NodeClass._restoreAsync(
                  executor,
                  child,
                  childArg,
                  childRestored,
                  childProgress,
                  childTotal,
                  (restoredChild) => {
                    parent.appendChild(restoredChild as Node);
                  },
                );
              },
              childrenDone,
            );
          },
          finish,
        );
      },
      done,
    );
  };

  const deserializeAsync: DeserializeAsync["deserializeAsync"] = (
    json,
    constructorArg,
    progress,
    onRestored,
    done,
  ) => {
    let result: Node | Node[] | null = null;
    const executor = new AsyncExecutor(0, 15, () => {
      done(result);
    });
    NodeClass._deserialize(
      json,
      constructorArg,
      progress,
      onRestored,
      (data, ctorArg, restored, prog, count, finish) => {
        if (!data) return;
        if (Array.isArray(data)) {
          const nodes: Node[] = [];
          executor.execute(
            data,
            (blob) => {
              NodeClass._restoreAsync(executor, blob, ctorArg, restored, prog, count, (node) => {
                if (node) nodes.push(node);
              });
            },
            () => {
              finish(nodes);
            },
          );
        } else NodeClass._restoreAsync(executor, data, ctorArg, restored, prog, count, finish);
      },
      (nodes) => {
        result = nodes;
      },
    );
  };

  NodeClass.deserializeAsync = deserializeAsync;
  NodeClass._restoreAsync = restoreAsync;
}
