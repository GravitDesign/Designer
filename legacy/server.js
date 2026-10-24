const express = require("express");
const path = require("path");
const http = require("http");
const { setupWebSocket } = require("./routes/ws");
const userRoutes = require("./routes/user");

const app = express();
const port = process.env.PORT || 3100;

// Body parsing
app.use(express.json());

// Static files - public dir (main app)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      const name = path.basename(filePath);
      if (name === "chunk.vendor.js" || name === "designer.browser.js") {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      }
    },
  }),
);

// Static files - docs
app.use("/docs", express.static(path.join(__dirname, "docs")));

// API routes
app.get("/connection/test", (_req, res) => res.send("OK"));
app.use(userRoutes);

// Maintenance status
app.get("/maintenance/status", (_req, res) => {
  res.json({ maintenance: false });
});

// i18n URL
app.get("/i18n-url/:locale/designer", (_req, res) => {
  res.json({});
});

// License check (GET) — returns data consumed directly by the License constructor
app.get("/license", (_req, res) => {
  res.json({
    license: "pro",
    expire: "2099-12-31T23:59:59.000Z",
    created: "2021-09-22T19:58:35.018Z",
    legacy: false,
  });
});

// Subscription test
app.get("/subscription/test", (_req, res) => {
  res.json({ active: true, plan: "pro", status: 1 });
});

// Subscription endpoints
app.get("/subscription/nextbillingdate", (_req, res) => {
  res.json({ date: "2099-12-31T23:59:59.000Z" });
});
app.get("/subscription/lifetime", (_req, res) => {
  res.json({ lifetime: true });
});

// Quota
app.get("/quota", (_req, res) => {
  res.json({ quota: { pro: {}, free: {} } });
});

// Subscription history
app.get("/ever-subscribed", (_req, res) => {
  res.json({ subscribed: true });
});
app.get("/total-subscription-days", (_req, res) => {
  res.json({ days: 9999 });
});

// Pro paywall (return empty page so client doesn't 404)
app.get("/pro/paywall/:page", (_req, res) => {
  res.send("");
});

// File listing
app.get("/file", (_req, res) => {
  res.json([]);
});

// Catch /null requests (client bug sends null URL)
app.get("/null", (_req, res) => {
  res.json({});
});

// Request logger (after static, so only API hits are logged)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// HTTP + WebSocket server
const server = http.createServer(app);
setupWebSocket(server);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
