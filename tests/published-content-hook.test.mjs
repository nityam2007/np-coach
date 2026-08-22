import assert from "node:assert/strict";
import test from "node:test";
import publishedContentHook from "../extensions/directus-extension-np-published/dist/index.js";

function harness(accountability = null) {
  const filters = new Map();
  publishedContentHook({
    filter(name, handler) {
      filters.set(name, handler);
    },
  });

  return (name, payload, collection, meta = { collection }) => filters.get(name)(
    payload,
    meta,
    { accountability },
  );
}

test("anonymous content queries always include the published filter", () => {
  const run = harness();
  assert.deepEqual(run("items.query", { sort: ["sort"] }, "services"), {
    sort: ["sort"],
    filter: { status: { _eq: "published" } },
  });
  assert.deepEqual(
    run("items.query", { filter: { slug: { _eq: "private-hire" } } }, "services"),
    {
      filter: {
        _and: [
          { status: { _eq: "published" } },
          { slug: { _eq: "private-hire" } },
        ],
      },
    },
  );
});

test("anonymous direct reads cannot return draft content", () => {
  const run = harness();
  assert.deepEqual(
    run("items.read", [
      { id: 1, status: "published" },
      { id: 2, status: "draft" },
    ], "pages"),
    [{ id: 1, status: "published" }],
  );
  assert.equal(run("items.read", { id: 2, status: "draft" }, "pages"), null);
});

test("authenticated Directus reads are unchanged", () => {
  const run = harness({ user: "editor" });
  const query = { filter: { status: { _eq: "draft" } } };
  assert.equal(run("items.query", query, "pages"), query);
});

test("anonymous file reads expose display-safe metadata only", () => {
  const run = harness();
  assert.deepEqual(
    run("files.read", {
      id: "file-id",
      title: "Coach",
      type: "image/jpeg",
      filename_disk: "private-storage-name.jpg",
      storage: "local",
      uploaded_by: "admin-id",
    }, "directus_files", { collection: "directus_files", query: { fields: ["*"] } }),
    {
      id: "file-id",
      title: "Coach",
      type: "image/jpeg",
    },
  );

  assert.deepEqual(
    run("files.query", { fields: ["filename_disk"] }, "directus_files"),
    { fields: ["id", "title", "type", "width", "height", "description", "modified_on"] },
  );

  const internalAsset = { id: "file-id", filename_disk: "asset.jpg", storage: "local" };
  assert.equal(
    run(
      "files.read",
      internalAsset,
      "directus_files",
      { collection: "directus_files", query: { limit: 1, filter: { id: { _eq: "file-id" } } } },
    ),
    internalAsset,
  );
});
