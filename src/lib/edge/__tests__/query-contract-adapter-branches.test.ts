import { describe, expect, it, vi } from "vitest";
const readers = vi.hoisted(() => ({
  queryFunnelAnalysis: vi.fn(),
  queryFunnelDefinition: vi.fn(),
  queryFunnelDefinitions: vi.fn(),
  queryFunnelDefinitionsPage: vi.fn(),
  decodeFunnelDefinitionCursor: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/funnels", () => ({
  queryFunnelAnalysis: readers.queryFunnelAnalysis,
  queryFunnelDefinition: readers.queryFunnelDefinition,
  queryFunnelDefinitions: readers.queryFunnelDefinitions,
  queryFunnelDefinitionsPage: readers.queryFunnelDefinitionsPage,
  decodeFunnelDefinitionCursor: readers.decodeFunnelDefinitionCursor,
}));
import { handleFunnelAnalysisContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/funnels";
import type { Env } from "@/lib/edge/types";
const env = { DB: {} } as unknown as Env;
const siteId = "site-contract-branches";
const base = "from=1767225600000&to=1767312000000";
describe("typed contract adapter data branches", () => {
  it("runs funnel analysis only for a complete definition", async () => {
    readers.queryFunnelDefinition.mockResolvedValue({
      id: "funnel-1",
      steps: [
        { type: "pageview", value: "/" },
        { type: "event", value: "signup" },
      ],
    });
    readers.queryFunnelAnalysis.mockResolvedValue({ completed: 1 });

    const response = await handleFunnelAnalysisContract(
      env,
      siteId,
      new URL(`https://edge.test/query?${base}&id=funnel-1`),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        funnel: { id: "funnel-1" },
        analysis: { completed: 1 },
      },
    });
    expect(readers.queryFunnelAnalysis).toHaveBeenCalledOnce();
  });

  it("returns funnel definitions inside the standard data envelope", async () => {
    readers.decodeFunnelDefinitionCursor.mockResolvedValueOnce(null);
    readers.queryFunnelDefinitionsPage.mockResolvedValueOnce({
      items: [{ id: "funnel-1", name: "Signup" }],
      pagination: {
        limit: 50,
        returned: 1,
        hasMore: false,
        nextCursor: null,
      },
    });

    const response = await handleFunnelAnalysisContract(
      env,
      siteId,
      new URL("https://edge.test/query"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        items: [{ id: "funnel-1", name: "Signup" }],
        pagination: { returned: 1, hasMore: false },
      },
    });
  });

  it("rejects definitions without enough funnel steps", async () => {
    readers.queryFunnelDefinition.mockResolvedValueOnce({
      id: "short-funnel",
      steps: [{ type: "pageview", value: "/" }],
    });

    const response = await handleFunnelAnalysisContract(
      env,
      siteId,
      new URL(`https://edge.test/query?${base}&id=short-funnel`),
    );

    expect(response.status).toBe(400);
  });
});
