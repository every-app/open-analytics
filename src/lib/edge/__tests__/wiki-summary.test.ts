import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleWikiSummaryRequest } from "@/lib/edge/resources/wiki-summary";

describe("wiki summary route", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects invalid or missing wikidata ids", async () => {
    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=bad",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await response.json()).toEqual({
      ok: false,
      error: "Invalid or missing wikidataId",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 404 when Wikidata does not contain the requested entity", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ entities: {} })),
    );

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=q42",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Wikidata entity not found",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns Wikidata-only entities without labels or sitelinks", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ entities: { Q99: { id: "Q99" } } })),
    );

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q99",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      ok: true,
      wikidataId: "Q99",
      wikidata: {
        id: "Q99",
        label: "Q99",
        description: null,
      },
      wikipedia: null,
    });
  });

  it("resolves English Wikidata labels and the English Wikipedia summary", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entities: {
              Q5: {
                labels: {
                  en: { value: "Human" },
                  zh: { value: "人类" },
                },
                descriptions: {
                  en: { value: "Wikidata concept" },
                },
                sitelinks: {
                  zhwiki: {
                    title: "人",
                    url: "https://zh.wikipedia.org/wiki/人",
                  },
                  enwiki: {
                    title: "Human",
                    url: "https://en.wikipedia.org/wiki/Human",
                  },
                },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            title: "Human being",
            description: "Summary description",
            extract: "Summary text",
            extract_html: "<p>Summary text</p>",
            thumbnail: { source: "https://upload.test/human.png" },
            content_urls: {
              desktop: {
                page: "https://en.wikipedia.org/wiki/Homo_sapiens",
              },
            },
          }),
        ),
      );

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=q5",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://en.wikipedia.org/api/rest_v1/page/summary/Human",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "accept-language": expect.any(String),
        }),
      }),
    );
    expect(await response.json()).toEqual({
      ok: true,
      wikidataId: "Q5",
      wikidata: {
        id: "Q5",
        label: "Human",
        description: "Wikidata concept",
      },
      wikipedia: {
        title: "Human being",
        description: "Summary description",
        extract: "Summary text",
        extractHtml: "<p>Summary text</p>",
        thumbnailUrl: "https://upload.test/human.png",
        pageUrl: "https://en.wikipedia.org/wiki/Homo_sapiens",
      },
    });
  });

  it("falls back to the sitelink and Wikidata description when the summary is empty", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entities: {
              Q42: {
                labels: { en: { value: "Douglas Adams" } },
                descriptions: { en: { value: "English writer" } },
                sitelinks: {
                  enwiki: {
                    title: "Douglas Adams",
                    url: "https://en.wikipedia.org/wiki/Douglas_Adams",
                  },
                },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: "" })));

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q42",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(await response.json()).toMatchObject({
      wikipedia: {
        title: "Douglas Adams",
        description: "English writer",
        pageUrl: "https://en.wikipedia.org/wiki/Douglas_Adams",
      },
    });
  });

  it("skips Wikipedia when the entity has no English article", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          entities: {
            Q88: {
              labels: { zh: { value: "條目" } },
              sitelinks: { zhwiki: { title: "條目" } },
            },
          },
        }),
      ),
    );

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q88",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      ok: true,
      wikidataId: "Q88",
      wikidata: { id: "Q88", label: "Q88", description: null },
      wikipedia: null,
    });
  });

  it("falls back to Wikidata-only payloads when Wikipedia has no page", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entities: {
              Q7: {
                labels: {
                  en: { value: "Entity Seven" },
                },
                descriptions: {},
                sitelinks: {
                  enwiki: {
                    title: "Entity Seven",
                  },
                },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response("not found", { status: 404 }));

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q7",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      wikidataId: "Q7",
      wikidata: {
        id: "Q7",
        label: "Entity Seven",
        description: null,
      },
      wikipedia: {
        title: "Entity Seven",
        description: null,
        extract: null,
        extractHtml: null,
        thumbnailUrl: null,
        pageUrl: null,
      },
    });
  });

  it("returns 502 when upstream requests fail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("rate limited", { status: 429 }),
    );

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q42",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Wiki upstream unavailable",
    });
  });

  it("returns 502 when Wikipedia summary requests fail", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entities: {
              Q42: {
                labels: { en: { value: "Douglas Adams" } },
                sitelinks: { enwiki: { title: "Douglas Adams" } },
              },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }));

    const response = await handleWikiSummaryRequest(
      new Request(
        "https://app.test/api/public/resources/wiki-summary?wikidataId=Q42",
        {
          headers: { origin: "https://app.test" },
        },
      ),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Wiki upstream unavailable",
    });
  });
});
