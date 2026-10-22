/**
 * What the UI scenarios need from `window.__parity.app.ui` besides the
 * shared hooks. The old app implements it in old-hooks.js; the new app's
 * parity build must provide the same.
 */
export interface UiHooks {
  /**
   * Shows a plain text notification in the notification panel, as
   * gDesigner.addNotification(message) does in the old app (UI-NOTIFY-001).
   */
  notify(message: string): void;
}
