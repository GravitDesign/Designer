/**
 * What the corpus scenarios need from `window.__parity.app.corpus`. The old
 * app gets it from old-hooks.js; the new app must provide the same.
 */
export interface CorpusHooks {
  /**
   * Resolves once the active document is fully drawn and nothing is left
   * to load: every image and texture pattern has loaded (or failed), no
   * font is pending, and the view has no scheduled repaint and no queued or
   * running tile render, for `quietFrames` animation frames in a row
   * (default 10). Rejects after `timeout` ms (default 120000).
   */
  settle(options?: { quietFrames?: number; timeout?: number }): Promise<void>;
  /**
   * Resolves once the document titled `title` (the file name without
   * extension) is the active document and has finished loading (document
   * status Ready, after Loading and Loaded), the view box and the number of
   * scene nodes have not changed for a second, and it has settled as above.
   */
  waitForDocument(title: string, timeout?: number): Promise<void>;
  /** Every image and texture pattern in the active scene has loaded. */
  assetsReady(): boolean;
  /** No font is pending in the workspace font manager. */
  fontsReady(): boolean;
  /** The active view has no scheduled repaint and no queued tile render. */
  viewIdle(): boolean;
  /**
   * Saves the active document with the app's own save code (File >
   * Download File, action file.save-as.gvdesign) and resolves with the
   * bytes of the file that save writes, base64 encoded. The bytes must come
   * out of the real save path, never be built some other way: the compat
   * scenarios open them in the old app to prove that files saved by the
   * new app open the same there (parity/scenarios/compat).
   */
  saveDocumentBytes(timeout?: number): Promise<string>;
  /**
   * Opens `base64` as a file named `fileName` through the app's own open
   * path (File > Open Local File, action file.open, which reads the chosen
   * File), then waits like waitForDocument for the title (`fileName`
   * without ".gvdesign").
   */
  openDocumentBytes(base64: string, fileName: string): Promise<void>;
  /**
   * Every open document in tab order: its title, its load state ("ready"
   * once loaded and shown, "loading" while the file is still being read or
   * when reading it failed, "loaded" in between) and whether it has a scene.
   */
  documentStates(): { title: string; status: string; hasScene: boolean }[];
}
