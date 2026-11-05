import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import cors from "cors";
import express from "express";
import { createCorsOptions } from "../src/corsConfig.js";

test("CORS allows the production Vercel origin and configured origins only", () => {
  const options = createCorsOptions({
    FRONTEND_URL: "https://preview.example.com",
    NODE_ENV: "production",
  });
  const checkOrigin = (origin) =>
    new Promise((resolve, reject) => {
      options.origin(origin, (error, allowed) => {
        if (error) reject(error);
        else resolve(allowed);
      });
    });

  return Promise.all([
    checkOrigin("https://mend-and-blend.vercel.app"),
    checkOrigin("https://preview.example.com"),
    checkOrigin("https://untrusted.example.com"),
  ]).then(([productionOriginAllowed, configuredOriginAllowed, untrustedOriginAllowed]) => {
    assert.equal(productionOriginAllowed, true);
    assert.equal(configuredOriginAllowed, true);
    assert.equal(untrustedOriginAllowed, false);
    assert.deepEqual(options.methods, [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ]);
    assert.deepEqual(options.allowedHeaders, ["Authorization", "Content-Type"]);
  });
});

test("CORS preflight permits authenticated API requests from the production origin", async (t) => {
  const app = express();
  app.use(
    cors(
      createCorsOptions({
        FRONTEND_URL: "",
        NODE_ENV: "production",
      }),
    ),
  );
  app.get("/api/admin/session", (req, res) => res.status(200).end());
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/session`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://mend-and-blend.vercel.app",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://mend-and-blend.vercel.app",
  );
  assert.match(response.headers.get("access-control-allow-methods"), /GET/);
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
  assert.match(response.headers.get("access-control-allow-headers"), /Content-Type/i);
});
