import assert from "node:assert/strict";
import test from "node:test";
import { siteUrl } from "../src/lib/site-url.ts";

test("runtime site URL overrides CMS URL and removes paths/trailing slashes", () => {
  const previousSite = process.env.SITE_URL;
  const previousPublic = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.SITE_URL = "https://demo.example.test/subpath/";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.test";
    assert.equal(siteUrl("https://cms.example.test"), "https://demo.example.test");
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSite;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousPublic;
  }
});

test("public environment URL overrides the CMS fallback", () => {
  const previousSite = process.env.SITE_URL;
  const previousPublic = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.test/";
    assert.equal(siteUrl("https://cms.example.test"), "https://www.example.test");
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSite;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousPublic;
  }
});
