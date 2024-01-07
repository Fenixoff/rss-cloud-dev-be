import { createServer } from "node:http";
import httpProxy from "http-proxy";

import "dotenv/config";

const rules = JSON.parse(process.env.RULES);

const hostname = "0.0.0.0";
const port = 3000;

const proxy = httpProxy.createProxyServer({ changeOrigin: true });
const cache = {};

proxy.on("proxyRes", (_proxyRes, req, res) => {
  if (req.url === "/products") {
    cache.res = res;
    cache.time = Date.now();
  }
});

const server = createServer((req, res) => {
  const [_, service, path] = req.url.match(/^\/([^\/]+)(.*)$/);
  const target = rules[service];

  if (target) {
    // if (req.url === "/product/products" && cache.time > Date.now() - 20000) {

    // }
    req.url = path;
    return proxy.web(req, res, { target });
  }

  res.statusCode = 502;
  res.setHeader("Content-Type", "text/plain");
  res.end("Cannot process request\n");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
