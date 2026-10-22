import http from "node:http";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3100);
const host = process.env.HOST ?? "127.0.0.1";

const server = http.createServer(createApp());
server.listen(port, host, () => {
  console.log(`Gravit Designer running at http://${host}:${port}`);
});
