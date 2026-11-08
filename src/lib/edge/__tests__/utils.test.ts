import { describe, expect, it, vi } from "vitest";

import {
  clampString,
  coerceNumber,
  coerceString,
  deriveServerSessionId,
  deriveVisitorId,
  ID_HEX_DIGITS,
  idFromSha256Hex,
  isSameHostname,
  jsonCloneRecord,
  nowEpochSeconds,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  safeHostname,
  TEN_MINUTES_MS,
} from "@/lib/edge/utils";
import { sha256Hex } from "@/lib/sha256";

describe("edge utility helpers", () => {
  it("exports millisecond duration constants", () => {
    expect(TEN_MINUTES_MS).toBe(600_000);
    expect(ONE_HOUR_MS).toBe(3_600_000);
    expect(ONE_DAY_MS).toBe(86_400_000);
  });

  it("coerces strings and numbers with fallbacks", () => {
    expect(coerceString("value", "fallback")).toBe("value");
    expect(coerceString(5, "fallback")).toBe("fallback");

    expect(coerceNumber(12)).toBe(12);
    expect(coerceNumber("12.5")).toBe(12.5);
    expect(coerceNumber("", 7)).toBe(7);
    expect(coerceNumber(Number.NaN, 7)).toBe(7);
    expect(coerceNumber({}, null)).toBeNull();
  });

  it("clones JSON records and rejects non-record or unserializable values", () => {
    const input = { nested: { value: 1 } };
    const cloned = jsonCloneRecord(input);

    expect(cloned).toEqual(input);
    expect(cloned).not.toBe(input);
    expect(jsonCloneRecord(null)).toBeNull();
    expect(jsonCloneRecord({ bad: 1n })).toBeNull();
  });

  it("normalizes hostnames for safe comparison", () => {
    expect(safeHostname("https://Example.com/path")).toBe("example.com");
    expect(safeHostname("not a url")).toBe("");

    expect(isSameHostname(" Example.COM. ", "example.com")).toBe(true);
    expect(isSameHostname("", "example.com")).toBe(false);
    expect(isSameHostname("a.example", "b.example")).toBe(false);
  });

  it("clamps strings by maximum length", () => {
    expect(clampString("abc", 5)).toBe("abc");
    expect(clampString("abcdef", 3)).toBe("abc");
  });

  it("keeps an id's first 13 hex digits: 52 bits, a safe JS integer", () => {
    expect(ID_HEX_DIGITS).toBe(13);
    expect(idFromSha256Hex("fffffffffffff".padEnd(64, "0"))).toBe(2 ** 52 - 1);
    expect(2 ** 52 - 1).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(
      idFromSha256Hex(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      ),
    ).toBe(0xba7816bf8f01c);
    expect(idFromSha256Hex("0000000000001")).toBe(1);
    for (const notHex of ["ABCDEF0123456", "55f62b50-0a2b", "abc", ""]) {
      expect(() => idFromSha256Hex(notHex), notHex).toThrow(TypeError);
    }
  });

  it("derives stable SHA-256 based identifiers", async () => {
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const visitor = {
      salt: "salt",
      siteId: "site-1",
      ip: "203.0.113.10",
      ua: "Mozilla/5.0",
    };
    const visitorId = await deriveVisitorId(visitor);
    expect(visitorId).toBe(
      idFromSha256Hex(await sha256Hex("salt|site-1|203.0.113.10|Mozilla/5.0")),
    );
    await expect(deriveVisitorId(visitor)).resolves.toBe(visitorId);
    await expect(
      deriveVisitorId({ ...visitor, salt: "next-day" }),
    ).resolves.not.toBe(visitorId);
    await expect(
      deriveVisitorId({ ...visitor, siteId: "site-2" }),
    ).resolves.not.toBe(visitorId);

    const startedAt = Date.UTC(2026, 4, 26, 12);
    const serverSessionId = await deriveServerSessionId({
      siteId: "site-1",
      visitorId,
      visitId: "visit-1",
      startedAt,
    });
    expect(serverSessionId).toBe(
      idFromSha256Hex(
        await sha256Hex(
          `server-session-v1|site-1|${visitorId}|visit-1|${startedAt}`,
        ),
      ),
    );
    await expect(
      deriveServerSessionId({
        siteId: "site-1",
        visitorId,
        visitId: "visit-1",
        startedAt,
      }),
    ).resolves.toBe(serverSessionId);
  });

  it("returns epoch seconds for the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T12:34:56.789Z"));
    try {
      expect(nowEpochSeconds()).toBe(1_779_798_896);
    } finally {
      vi.useRealTimers();
    }
  });
});
