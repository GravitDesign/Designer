const WebSocket = require("ws");

const PRO_LICENSE_DATA = {
  license: "pro",
  expire: "2099-12-31T23:59:59.000Z",
  created: "2021-09-22T19:58:35.018Z",
  legacy: false,
};

function setupWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/license/license",
    verifyClient: (_info, done) => done(true),
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const lang = url.searchParams.get("lang");
    console.log(`WS connected (lang=${lang})`);

    // Send pro license immediately on connect
    ws.send(JSON.stringify({ name: "license", data: PRO_LICENSE_DATA }));

    ws.on("message", (message) => {
      const raw = message.toString();
      // Client sends raw "ping" string for keepalive
      if (raw === "ping") {
        ws.send(JSON.stringify({ name: "pong" }));
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed.name === "ping") {
          ws.send(JSON.stringify({ name: "pong" }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => console.log("WS disconnected"));
  });

  return wss;
}

module.exports = { setupWebSocket };
