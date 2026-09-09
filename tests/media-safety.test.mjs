import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("CSP permits video from the configured CMS without broadening default-src", async () => {
  const original = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  process.env.NEXT_PUBLIC_DIRECTUS_URL = "https://media.example.test";
  try {
    const { default: config } = await import("../next.config.ts");
    const entries = await config.headers();
    const csp = entries[0].headers.find((header) => header.key === "Content-Security-Policy").value;
    const directives = csp.split("; ");
    assert.ok(directives.includes("media-src 'self' https://media.example.test"));
    assert.ok(directives.includes("default-src 'self'"));
    assert.ok(directives.includes("object-src 'none'"));
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DIRECTUS_URL;
    else process.env.NEXT_PUBLIC_DIRECTUS_URL = original;
  }
});

async function runMediaSeed(t, data, status = 200) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const child = spawn(process.execPath, ["scripts/upload-media.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      DIRECTUS_URL: `http://127.0.0.1:${server.address().port}`,
      DIRECTUS_ADMIN_TOKEN: "local-test-token",
      DIRECTUS_BOOTSTRAP_MAX_RETRIES: "0",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const [code] = await once(child, "close");
  // No upload, PATCH, DELETE, permission changes, or content reseeding is allowed.
  assert.deepEqual(requests, [{ method: "GET", url: "/items/settings?fields=client_media_revision" }]);
  return { code, output };
}

for (const revision of ["client-review-2026-08-20-v2", "future-editor-media-revision"]) {
  test(`media bootstrap preserves all editor choices for ${revision}`, { timeout: 10_000 }, async (t) => {
    const result = await runMediaSeed(t, { client_media_revision: revision });
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /all CMS selections and cleared fields preserved/);
  });
}

for (const [label, data, status] of [
  ["missing marker field", {}, 200],
  ["missing singleton", null, 200],
  ["CMS request failure", null, 500],
]) {
  test(`media bootstrap fails closed on ${label}`, { timeout: 10_000 }, async (t) => {
    const result = await runMediaSeed(t, data, status);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /Media upload failed/);
  });
}
