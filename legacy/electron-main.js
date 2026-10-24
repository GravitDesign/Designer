const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const http = require("http");

let mainWindow;
let server;

// Fixed port so the page origin (http://127.0.0.1:PORT) stays constant across
// launches. localStorage — where Gravit Designer keeps the theme and other
// preferences — is partitioned by origin, so a random port (listen(0)) would
// give every launch a fresh, empty store and reset all settings.
const FIXED_PORT = 47823;

function startServer() {
  return new Promise((resolve) => {
    const express = require("express");
    const { setupWebSocket } = require("./routes/ws");
    const userRoutes = require("./routes/user");

    const expressApp = express();

    expressApp.use(express.json());

    expressApp.use(
      express.static(path.join(__dirname, "public"), {
        setHeaders: (res, filePath) => {
          const name = path.basename(filePath);
          if (name === "chunk.vendor.js" || name === "designer.browser.js") {
            res.setHeader(
              "Cache-Control",
              "public, max-age=2592000, immutable",
            );
          }
        },
      }),
    );

    expressApp.use("/docs", express.static(path.join(__dirname, "docs")));

    expressApp.get("/connection/test", (_req, res) => res.send("OK"));
    expressApp.use(userRoutes);

    expressApp.get("/maintenance/status", (_req, res) => {
      res.json({ maintenance: false });
    });

    expressApp.get("/i18n-url/:locale/designer", (_req, res) => {
      res.json({});
    });

    expressApp.get("/license", (_req, res) => {
      res.json({
        plan: "pro",
        status: "active",
        expireDate: "2099-12-31T23:59:59.000Z",
        features: [],
      });
    });

    expressApp.get("/subscription/test", (_req, res) => {
      res.json({ active: true, plan: "pro" });
    });

    expressApp.get("/file", (_req, res) => {
      res.json([]);
    });

    expressApp.get("/null", (_req, res) => {
      res.json({});
    });

    server = http.createServer(expressApp);
    setupWebSocket(server);

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // Don't fall back to a random port: that changes the origin and would
        // reset the user's settings. Surface the conflict instead.
        dialog.showErrorBox(
          "Gravit Designer",
          `Port ${FIXED_PORT} is already in use. Another instance may be ` +
            `running, or another program is using the port. Close it and ` +
            `relaunch Gravit Designer.`,
        );
      } else {
        dialog.showErrorBox("Gravit Designer", `Server error: ${err.message}`);
      }
      app.quit();
    });

    server.listen(FIXED_PORT, "127.0.0.1", () => {
      const assignedPort = server.address().port;
      console.log(`Embedded server on http://127.0.0.1:${assignedPort}`);
      resolve(assignedPort);
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Gravit Designer",
    icon: path.join(
      __dirname,
      "public",
      "assets",
      "prerendered",
      "icon512.png",
    ),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Only one instance may run, so the fixed port is reliably ours. A second
// launch focuses the existing window instead of fighting over the port.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("ready", async () => {
    const port = await startServer();
    createWindow(port);
  });
}

app.on("window-all-closed", () => {
  if (server) server.close();
  app.quit();
});

app.on("activate", async () => {
  if (mainWindow === null) {
    const port = server ? server.address().port : await startServer();
    createWindow(port);
  }
});
