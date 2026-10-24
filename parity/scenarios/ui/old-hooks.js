/* global window */
// UI area hooks for the old app (see contract.ts for what the new app must
// provide). Injected after old-harness.js.
(() => {
  const app = window.__parity && window.__parity.app;
  if (!app || app.ui) return;
  app.ui = {
    // Shows a plain message in the notification panel (#footer), the way
    // the app reports errors and info to the user: addNotification takes a
    // notification object ({ message }), as the error handlers pass it.
    notify(message) {
      window.gDesigner.addNotification({ message });
    },
  };
})();
