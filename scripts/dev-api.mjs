// Sirve api/analyze.js en :3001 para desarrollo, emulando (req, res) de Vercel.
// ponytail: solo el subset que usa el handler (status/json + body parseado).
import http from "node:http";
import { readFileSync } from "node:fs";
import handler from "../api/analyze.js";

// Carga .env.local sin dependencia dotenv.
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch { /* sin .env.local: la env tiene que venir de la shell */ }

http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };
    try {
      await handler(req, res);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}).listen(3001, "127.0.0.1", () => console.log("API dev en http://127.0.0.1:3001/api/analyze"));
