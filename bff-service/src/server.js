import { createServer } from "node:http";
import httpProxy from "http-proxy";

import "dotenv/config";

const rules = JSON.parse(process.env.RULES);
const cachingMsecs = 20000;

const port = process.env.PORT || 3000;

const proxy = httpProxy.createProxyServer({ changeOrigin: true });
const cache = {};

proxy.on("proxyRes", (proxyRes, req, res) => {
  if (req.url === "/products") {
    const chunks = [];

    proxyRes.on("data", (chunk) => {
      chunks.push(chunk);
    });

    proxyRes.on("end", () => {
      cache.body = Buffer.concat(chunks);
      cache.headers = proxyRes.headers;
      cache.statusCode = proxyRes.statusCode;
      cache.time = Date.now();
    });
  }
});

const server = createServer((req, res) => {
  const [_, service, path] = req.url.match(/^\/([^\/]+)(.*)$/);
  const target = rules[service];

  if (target) {
    if (
      req.url === "/product/products" &&
      cache.body &&
      cache.time > Date.now() - cachingMsecs
    ) {
      res.writeHead(cache.statusCode, cache.headers).end(cache.body);
    } else {
      req.url = path;
      proxy.web(req, res, { target });
    }
  } else {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain");
    res.end("Cannot process request\n");
  }
});

server.listen(port);
