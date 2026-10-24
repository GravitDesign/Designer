// Classes of later clusters that the style code refers to. The old code
// required them directly; here the owning cluster registers them once at
// load time:
//
//   engine-scene-document (workspace.ts):
//     registerWorkspace(Workspace);
//   engine-effects-webgl (noise-pattern.ts):
//     registerNoisePattern(NoisePattern);
//
// Until then, a texture pattern made from a node with images cannot load
// them (getTexture throws the error below) and Swatch.equals compares
// noise patterns like any other texture.

/** What GTexturePattern.getTexture needs from GWorkspace (chunk.vendor.js module 280). */
export interface WorkspaceLike {
  resolveUrl(url: string, callback: (resolved: string) => void, scene: unknown): void;
}

export type WorkspaceClass = new () => WorkspaceLike;

/** GNoisePattern (chunk.vendor.js module 518); only `_type` is read here. */
export interface NoisePatternLike {
  _type: unknown;
}

export type NoisePatternClass = abstract new (...args: never[]) => NoisePatternLike;

let workspaceClass: WorkspaceClass | null = null;
let noisePatternClass: NoisePatternClass | null = null;

export function registerWorkspace(cls: WorkspaceClass): void {
  workspaceClass = cls;
}

export function getWorkspaceClass(): WorkspaceClass {
  if (!workspaceClass) {
    throw new Error("GWorkspace is not registered (engine-scene-document calls registerWorkspace)");
  }
  return workspaceClass;
}

export function registerNoisePattern(cls: NoisePatternClass): void {
  noisePatternClass = cls;
}

export function getNoisePatternClass(): NoisePatternClass | null {
  return noisePatternClass;
}
