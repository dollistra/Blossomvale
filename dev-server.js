"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp"
};

const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname.includes("\\") || pathname.split("/").some((part) => part === "." || part === "..")) {
    response.writeHead(404).end("Not found");
    return;
  }

  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(root, `.${relativePath}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(404).end("Not found");
    return;
  }

  let fileStat;
  try {
    fileStat = await fs.promises.stat(filePath);
  } catch {
    // Show the friendly 404 page for missing pages (not for missing images, scripts and so on).
    if (path.extname(pathname) === "" || path.extname(pathname) === ".html") {
      try {
        const page = await fs.promises.readFile(path.join(root, "404.html"));
        response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(page);
        return;
      } catch {}
    }
    response.writeHead(404).end("Not found");
    return;
  }
  const contentType = contentTypes[path.extname(filePath).toLowerCase()];
  if (!fileStat.isFile() || !contentType) {
    response.writeHead(404).end("Not found");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": fileStat.size
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Blossom Vale is available at http://${host}:${port}`);
});
