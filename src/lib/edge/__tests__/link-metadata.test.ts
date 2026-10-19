import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleLinkMetadata } from "@/lib/edge/resources/link-metadata";

const fetchMock = vi.fn();

function lookup(url: string) {
  return handleLinkMetadata(
    new Request(
      `https://analytics.example.com/api/private/link-metadata?url=${encodeURIComponent(url)}`,
    ),
  );
}

// Page extraction runs on HTMLRewriter, which only the Workers runtime has;
// these cover which URLs the Worker will fetch and what it answers without
// a page to read.
describe("link metadata", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response("not a page", { headers: { "content-type": "text/plain" } }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only fetches public web pages", async () => {
    for (const url of [
      "ftp://example.com/",
      "http://127.0.0.1/",
      "http://[::1]/",
      "http://localhost/",
      "https://example.com:8443/",
      "https://user:pass@example.com/",
      "not a url",
    ]) {
      expect((await lookup(url)).status, url).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers no metadata for a page it can't read", async () => {
    const plain = await lookup("https://example.com/notes.txt");
    fetchMock.mockRejectedValue(new TypeError("network down"));
    const unreachable = await lookup("https://example.com/");

    expect(await plain.json()).toEqual({ ok: true, data: {} });
    expect(await unreachable.json()).toEqual({ ok: true, data: {} });
  });
});
