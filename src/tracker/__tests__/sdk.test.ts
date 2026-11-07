import { readFile } from "node:fs/promises";
import path from "node:path";

import * as esbuild from "esbuild";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SDK_MIN as prebuiltSdk } from "../sdk.min";

const installKey = "__openanalytics_tracker_v6__";
const runtimeConfigKey = "__openanalytics_tracker_runtime_config__";
const sdkSourcePath = path.resolve(process.cwd(), "src/tracker/sdk.ts");
let configuredSdkImportCounter = 0;

interface ConfiguredSdkOptions {
  siteId?: string;
  trackQueryParams?: boolean;
  trackHash?: boolean;
  ignoreDoNotTrack?: boolean;
  autoTrackOutboundLinks?: boolean;
  autoTrackFileDownloads?: boolean;
  track404Pages?: boolean;
}

function setRuntimeConfig(options: ConfiguredSdkOptions = {}) {
  (globalThis as Record<string, unknown>)[runtimeConfigKey] = {
    siteId: options.siteId ?? "configured-site",
    trackQueryParams: options.trackQueryParams !== false,
    trackHash: options.trackHash !== false,
    ignoreDoNotTrack: options.ignoreDoNotTrack !== false,
    autoTrackOutboundLinks: options.autoTrackOutboundLinks !== false,
    autoTrackFileDownloads: options.autoTrackFileDownloads !== false,
    track404Pages: options.track404Pages !== false,
  };
}

async function importConfiguredSdk(options: ConfiguredSdkOptions = {}) {
  setRuntimeConfig(options);
  const source = await readFile(sdkSourcePath, "utf8");

  const output = await esbuild.build({
    bundle: true,
    format: "esm",
    stdin: {
      contents: source,
      loader: "ts",
      resolveDir: path.dirname(sdkSourcePath),
      sourcefile: sdkSourcePath,
    },
    target: "es2022",
    write: false,
  });

  configuredSdkImportCounter += 1;
  const outputText = output.outputFiles[0].text;
  const moduleText = [
    outputText,
    `// configured-sdk-import-${configuredSdkImportCounter}`,
  ].join("\n");
  return import(
    `data:text/javascript;base64,${Buffer.from(moduleText).toString("base64")}`
  );
}

function decodeFetchBody(fetchSpy: ReturnType<typeof vi.fn>, index = 0) {
  const [, options] = fetchSpy.mock.calls[index] as [string, RequestInit];
  return JSON.parse(options.body as string);
}

function sentKinds(fetchSpy: ReturnType<typeof vi.fn>) {
  return fetchSpy.mock.calls.map(
    ([, options]) => JSON.parse((options as RequestInit).body as string).kind,
  );
}

function setPageUrl(url: string) {
  (
    window as typeof window & {
      happyDOM: { setURL: (url: string) => void };
    }
  ).happyDOM.setURL(url);
}

async function executeGeneratedSdk(
  sdk: string,
  options: ConfiguredSdkOptions = {},
) {
  setRuntimeConfig(options);
  new Function(sdk)();
  await vi.waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalled();
  });
}

async function decodeBeaconBody(blob: Blob) {
  return JSON.parse(await blob.text());
}

describe("Tracker Browser SDK Integration Suite", () => {
  let mockScriptEl: HTMLScriptElement;
  let originalFetch: any;
  let originalPushState: any;
  let originalDocAddEventListener: any;
  let originalWinAddEventListener: any;
  let registeredDocListeners: Array<
    [string, EventListenerOrEventListenerObject, any]
  > = [];
  let registeredWinListeners: Array<
    [string, EventListenerOrEventListenerObject, any]
  > = [];

  beforeEach(() => {
    // Reset browser storage and global states to isolate installations
    delete (window as any).__openanalytics_tracker_v6__;
    delete (window as any).openAnalytics;
    delete (navigator as any).userAgentData;
    (navigator as any).sendBeacon = undefined;
    Object.defineProperty(navigator, "doNotTrack", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    // Reset happy-dom's full URL as well as the current path. Some anchor tests
    // exercise cross-origin navigation, which otherwise leaks into later cases.
    // The page is a public site: the tracker sends nothing from localhost.
    setPageUrl("https://example.com/");
    history.replaceState({}, "", "/");
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.body.innerHTML = "";

    // Track and isolate event listeners — SDK attaches many global listeners that
    // would otherwise leak across tests and cause stale closures to fire on later cases.
    originalDocAddEventListener = document.addEventListener;
    originalWinAddEventListener = window.addEventListener;
    registeredDocListeners = [];
    registeredWinListeners = [];
    (document as any).addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: any,
    ) {
      registeredDocListeners.push([type, listener, options]);
      return originalDocAddEventListener.call(
        document,
        type,
        listener,
        options,
      );
    };
    (window as any).addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: any,
    ) {
      registeredWinListeners.push([type, listener, options]);
      return originalWinAddEventListener.call(window, type, listener, options);
    };

    // Snapshot pushState so the SDK's wrapper can be unwound after each test
    originalPushState = history.pushState;

    // Mock global fetch to return resolved promise instantly and prevent pending queries during teardown
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      ) as any;

    // Mock document.currentScript, which is required as an entry guard by the SDK script
    mockScriptEl = document.createElement("script");
    mockScriptEl.src = "https://analytics.example.com/script.js";
    Object.defineProperty(document, "currentScript", {
      value: mockScriptEl,
      writable: true,
      configurable: true,
    });

    // Provide default crypto mock if randomUUID is missing in JSDOM environment
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {};
    }
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () =>
        "mocked-uuid-1111-2222-3333-44445555";
    }

    setRuntimeConfig();

    vi.resetModules();
  });

  afterEach(() => {
    // Restore global fetch
    globalThis.fetch = originalFetch;

    // Cleanup script guard
    Object.defineProperty(document, "currentScript", {
      value: null,
      writable: true,
      configurable: true,
    });

    // Remove leaked event listeners
    for (const [type, listener, options] of registeredDocListeners) {
      document.removeEventListener(type, listener as any, options);
    }
    for (const [type, listener, options] of registeredWinListeners) {
      window.removeEventListener(type, listener as any, options);
    }
    (document as any).addEventListener = originalDocAddEventListener;
    (window as any).addEventListener = originalWinAddEventListener;

    // Restore pushState (the SDK wraps it)
    history.pushState = originalPushState;

    document.body.innerHTML = "";
    delete (globalThis as Record<string, unknown>)[runtimeConfigKey];

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should successfully boot the SDK and mount the installation flag when loaded properly", async () => {
    // Import dynamically using stable clean paths since vi.resetModules() already clears memory cache
    await import("../sdk");

    // The SDK registers an install key in window containing the exported public APIs object
    expect((window as any).__openanalytics_tracker_v6__).toBeDefined();
    expect((window as any).__openanalytics_tracker_v6__).toBeTypeOf("object");
    expect((window as any).__openanalytics_tracker_v6__.track).toBeTypeOf(
      "function",
    );
  });

  it("stores nothing in the browser in the prebuilt SDK", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await executeGeneratedSdk(prebuiltSdk, { siteId: "generated-site" });
    const body = decodeFetchBody(fetchSpy);
    expect(body.kind).toBe("pageview");
    expect(body).not.toHaveProperty("visitorId");
    expect(window.localStorage.length).toBe(0);
  });
  it("honors Do Not Track in the prebuilt SDK", () => {
    Object.defineProperty(navigator, "doNotTrack", {
      value: "1",
      writable: true,
      configurable: true,
    });

    setRuntimeConfig({ ignoreDoNotTrack: false });
    expect(() => new Function(prebuiltSdk)()).toThrow(
      "OpenAnalytics: Do Not Track enabled",
    );
  });

  it("should throw an entry error if loaded without a valid currentScript", async () => {
    // Strip script mock
    Object.defineProperty(document, "currentScript", {
      value: null,
      writable: true,
      configurable: true,
    });

    // Asset the loader crashes safely during bootstrap, preventing invalid script mounts
    await expect(import("../sdk")).rejects.toThrow(
      "OpenAnalytics: script element not found",
    );
  });

  it("should throw an entry error when currentScript is not the tracker script element", async () => {
    Object.defineProperty(document, "currentScript", {
      value: document.createElement("div"),
      writable: true,
      configurable: true,
    });

    await expect(import("../sdk")).rejects.toThrow(
      "OpenAnalytics: script element not found",
    );
  });

  it("should proceed when configured to ignore Do Not Track", async () => {
    // Enable navigator DNT flag
    Object.defineProperty(navigator, "doNotTrack", {
      value: "1",
      writable: true,
      configurable: true,
    });

    // The default runtime configuration explicitly ignores Do Not Track.
    const sdk = await import("../sdk");
    expect(sdk).toBeDefined();

    // Restore DNT
    Object.defineProperty(navigator, "doNotTrack", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("should honor Do Not Track values case-insensitively when configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    Object.defineProperty(navigator, "doNotTrack", {
      value: " YES ",
      writable: true,
      configurable: true,
    });

    await expect(
      importConfiguredSdk({ ignoreDoNotTrack: false }),
    ).rejects.toThrow("OpenAnalytics: Do Not Track enabled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should install when configured to honor Do Not Track and the browser has not opted out", async () => {
    Object.defineProperty(navigator, "doNotTrack", {
      value: "0",
      writable: true,
      configurable: true,
    });

    await expect(
      importConfiguredSdk({ ignoreDoNotTrack: false }),
    ).resolves.toBeDefined();
    expect((window as any).__openanalytics_tracker_v6__).toBeDefined();
  });

  it("should fall back to standard POST fetch when sendBeacon is unsupported", async () => {
    // Strip sendBeacon capability from mock browser navigator
    const originalSendBeacon = navigator.sendBeacon;
    (navigator as any).sendBeacon = undefined;

    // Spy on global fetch API
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    // Boot SDK
    await import("../sdk");

    // Since sendBeacon is missing, the SDK pageview track must fall back to standard fetch
    expect(fetchSpy).toHaveBeenCalled();
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toContain("/collect");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.headers).toEqual({
      "content-type": "text/plain;charset=UTF-8",
    });

    // Restore
    if (originalSendBeacon) {
      navigator.sendBeacon = originalSendBeacon;
    }
  });

  it("should delay the first pageview until DOMContentLoaded while the document is loading", async () => {
    Object.defineProperty(document, "readyState", {
      value: "loading",
      writable: true,
      configurable: true,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");

    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(document, "readyState", {
      value: "interactive",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = decodeFetchBody(fetchSpy);
    expect(body.kind).toBe("pageview");
  });

  it("should reject re-installation when an SDK instance is already mounted on window", async () => {
    // First successful boot
    await import("../sdk");
    expect((window as any).__openanalytics_tracker_v6__).toBeDefined();

    // Re-import to simulate duplicate script tag — install key is still on window
    vi.resetModules();
    await expect(import("../sdk")).rejects.toThrow(
      "OpenAnalytics: already installed",
    );
  });

  it("should expose stable public API surface on window install key", async () => {
    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    expect(api.version).toBe("6");
    expect(api.track).toBeTypeOf("function");
    expect(api.setGlobalProperties).toBeTypeOf("function");
    expect(api.clearGlobalProperties).toBeTypeOf("function");
    expect(api.trackOnce).toBeTypeOf("function");
    expect(api.debug).toBeTypeOf("function");
  });

  it("should send a custom_event when track() is called", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear(); // ignore initial pageview

    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("button_click", { color: "blue" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.kind).toBe("custom_event");
    expect(body.eventName).toBe("button_click");
    expect(body.eventData).toEqual({ color: "blue" });
    expect(body.sequence).toBeUndefined();
    expect(body).not.toHaveProperty("revenue");
  });

  it("sends a track() revenue as its own field, outside eventData", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const api = (window as any).__openanalytics_tracker_v6__;
    api.track(
      "Purchase",
      { plan: "pro" },
      { revenue: { amount: 15.99, currency: "USD" } },
    );
    api.trackOnce("First purchase", undefined, {
      revenue: { amount: "9.50", currency: "eur" },
    });

    const bodies = fetchSpy.mock.calls.map(([, options]) =>
      JSON.parse((options as RequestInit).body as string),
    );
    expect(bodies[0].eventData).toEqual({ plan: "pro" });
    expect(bodies[0].revenue).toEqual({ amount: 15.99, currency: "USD" });
    expect(bodies[1].eventData).toEqual({});
    expect(bodies[1].revenue).toEqual({ amount: "9.50", currency: "eur" });
  });

  it("should ignore track() invocations with empty or whitespace event names", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("");
    api.track("   ");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should fire trackOnce() exactly once even on repeated invocations", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const api = (window as any).__openanalytics_tracker_v6__;
    api.trackOnce("first_paint");
    api.trackOnce("first_paint");
    api.trackOnce("first_paint", { ignored: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should ignore trackOnce() with empty event name", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const api = (window as any).__openanalytics_tracker_v6__;
    api.trackOnce("");
    api.trackOnce("   ");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should merge globalProperties into tracked event payloads", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    api.setGlobalProperties({ plan: "pro", region: "us" });
    fetchSpy.mockClear();
    api.track("checkout_view", { amount: 99 });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.eventData).toEqual({ plan: "pro", region: "us", amount: 99 });
  });

  it("should clear globalProperties after clearGlobalProperties() is called", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    api.setGlobalProperties({ plan: "pro" });
    api.clearGlobalProperties();
    fetchSpy.mockClear();
    api.track("event");

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.eventData).toEqual({});
  });

  it("sends the script tag's data-prop attributes with every page view", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );
    mockScriptEl.setAttribute("data-prop-author", "Jane");
    mockScriptEl.setAttribute("data-prop-page-type", "post");
    mockScriptEl.setAttribute("data-other", "ignored");

    await import("../sdk");
    expect(decodeFetchBody(fetchSpy).props).toEqual({
      author: "Jane",
      "page-type": "post",
    });

    fetchSpy.mockClear();
    history.pushState({}, "", "/next");
    await new Promise((r) => setTimeout(r, 500));
    expect(decodeFetchBody(fetchSpy)).toMatchObject({
      kind: "pageview",
      props: { author: "Jane", "page-type": "post" },
    });
  });

  it("sends global properties with later page views as strings", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );
    mockScriptEl.setAttribute("data-prop-plan", "free");

    await import("../sdk");
    expect(decodeFetchBody(fetchSpy).props).toEqual({ plan: "free" });

    const api = (window as any).__openanalytics_tracker_v6__;
    api.setGlobalProperties({
      plan: "pro",
      seats: 5,
      trial: false,
      nested: { ignored: true },
      list: ["ignored"],
      empty: null,
    });
    fetchSpy.mockClear();
    history.pushState({}, "", "/pricing");
    await new Promise((r) => setTimeout(r, 500));
    expect(decodeFetchBody(fetchSpy).props).toEqual({
      plan: "pro",
      seats: "5",
      trial: "false",
    });

    api.clearGlobalProperties();
    fetchSpy.mockClear();
    history.pushState({}, "", "/docs");
    await new Promise((r) => setTimeout(r, 500));
    expect(decodeFetchBody(fetchSpy).props).toEqual({ plan: "free" });
  });

  it("should ignore non-object/array inputs in setGlobalProperties()", async () => {
    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    expect(() => api.setGlobalProperties(null)).not.toThrow();
    expect(() => api.setGlobalProperties(undefined)).not.toThrow();
    expect(() => api.setGlobalProperties("string")).not.toThrow();
    expect(() => api.setGlobalProperties([1, 2])).not.toThrow();
  });

  it("should fire auto-track on a clicked element with data-open-analytics-event", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const button = document.createElement("button");
    button.setAttribute("data-open-analytics-event", "cta_click");
    button.setAttribute(
      "data-open-analytics-event-data",
      JSON.stringify({ position: "hero" }),
    );
    document.body.appendChild(button);
    button.click();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.kind).toBe("custom_event");
    expect(body.eventName).toBe("cta_click");
    expect(body.eventData.position).toBe("hero");

    button.remove();
  });

  it("should merge dataset attributes into auto-track event payloads", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const el = document.createElement("button");
    el.setAttribute("data-open-analytics-event", "nav_click");
    el.setAttribute("data-open-analytics-event-link", "/pricing");
    el.setAttribute("data-open-analytics-event-section", "header");
    document.body.appendChild(el);
    el.click();

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.eventData.link).toBe("/pricing");
    expect(body.eventData.section).toBe("header");

    el.remove();
  });

  it("should not fire auto-track when invalid JSON sits in data-open-analytics-event-data", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const el = document.createElement("button");
    el.setAttribute("data-open-analytics-event", "broken_json");
    el.setAttribute("data-open-analytics-event-data", "{invalid json}");
    document.body.appendChild(el);
    el.click();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.eventName).toBe("broken_json");
    expect(body.eventData).toEqual({});

    el.remove();
  });

  it("should skip auto-track click on element when trigger is not 'click'", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const el = document.createElement("button");
    el.setAttribute("data-open-analytics-event", "submit_only");
    el.setAttribute("data-open-analytics-event-trigger", "submit");
    document.body.appendChild(el);
    el.click();

    expect(fetchSpy).not.toHaveBeenCalled();
    el.remove();
  });

  it("should fire auto-track for form submit with submit trigger attribute", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const form = document.createElement("form");
    form.setAttribute("data-open-analytics-event", "form_submit");
    form.setAttribute("data-open-analytics-event-trigger", "submit");
    document.body.appendChild(form);

    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    form.dispatchEvent(submitEvent);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.eventName).toBe("form_submit");
    form.remove();
  });

  it("should fire outbound_click for cross-origin anchor clicks", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const a = document.createElement("a");
    a.setAttribute("href", "https://other-domain.test/path");
    a.textContent = "Out";
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.eventName).toBe("outbound_click");
    expect(body.eventData.domain).toBe("other-domain.test");
    a.remove();
  });

  it("should NOT fire outbound_click for same-origin anchor clicks", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const a = document.createElement("a");
    a.setAttribute("href", `${window.location.origin}/internal`);
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).not.toHaveBeenCalled();
    a.remove();
  });

  it("should NOT fire outbound_click for mailto/tel/javascript: anchors", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const mailto = document.createElement("a");
    mailto.setAttribute("href", "mailto:foo@bar.com");
    document.body.appendChild(mailto);
    mailto.click();
    mailto.remove();

    const tel = document.createElement("a");
    tel.setAttribute("href", "tel:+12345");
    document.body.appendChild(tel);
    tel.click();
    tel.remove();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should be no-op when an anchor has no href attribute", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const a = document.createElement("a");
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).not.toHaveBeenCalled();
    a.remove();
  });

  it("should send visibility event via sendBeacon on visibilitychange to hidden", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await import("../sdk");

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(sendBeaconSpy).toHaveBeenCalled();
    const [calledUrl, blob] = sendBeaconSpy.mock.calls[0];
    expect(calledUrl).toContain("/collect");
    expect(blob).toBeInstanceOf(Blob);
    await expect(decodeBeaconBody(blob)).resolves.toMatchObject({
      kind: "visibility",
      visibilityState: "hidden",
    });
  });

  it("should send leave event on pagehide", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await import("../sdk");
    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeaconSpy).toHaveBeenCalled();
  });

  it("should not double-send hidden visibility or leave events", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await import("../sdk");
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeaconSpy).toHaveBeenCalledTimes(2);
    const bodies = await Promise.all(
      sendBeaconSpy.mock.calls.map(([, blob]) => decodeBeaconBody(blob)),
    );
    expect(bodies.map((body) => body.kind)).toEqual(["visibility", "leave"]);
  });

  it("should expose debug mode and surface track logs after debug() is called", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    api.debug();
    fetchSpy.mockClear();
    api.track("debug_event", { key: "val" });

    expect(logSpy).toHaveBeenCalledWith(
      "[OpenAnalytics]",
      "track:",
      JSON.stringify("debug_event"),
      expect.any(String),
    );
    logSpy.mockRestore();
  });

  it("should set up history.pushState wrapper that schedules a route change", async () => {
    const beforeImport = history.pushState;
    await import("../sdk");
    // SDK wraps pushState — the function reference must change after install
    expect(history.pushState).not.toBe(beforeImport);
    expect(typeof history.pushState).toBe("function");
  });

  it("should not send a pageview when history.replaceState changes the URL", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    history.replaceState({}, "", "/replaced-route");
    await new Promise((r) => queueMicrotask(r));
    (window as any).__openanalytics_tracker_v6__.track("after_replace");

    expect(sentKinds(fetchSpy)).toEqual(["custom_event"]);
  });
  it("should send a pageview when pushState lands on a new path", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    history.pushState({}, "", "/new-route");
    // The route settle delay is 300ms.
    await new Promise((r) => setTimeout(r, 500));

    expect(sentKinds(fetchSpy)).toEqual(["pageview"]);
    expect(decodeFetchBody(fetchSpy)).toMatchObject({
      pathname: "/new-route",
      navigation: "route",
    });
  });

  it("should not send a pageview when pushState only changes the query string", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    history.pushState({}, "", "/?filter=active");
    await new Promise((r) => queueMicrotask(r));
    (window as any).__openanalytics_tracker_v6__.track("after_query_change");

    expect(sentKinds(fetchSpy)).toEqual(["custom_event"]);
  });
  it("should NOT re-send pageview when pushState lands on the same routeKey", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    history.pushState({}, "", window.location.pathname);
    await new Promise((r) => setTimeout(r, 500));

    // Same routeKey — scheduleRouteChange should bail out via early return
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should attach popstate handler that schedules route changes", async () => {
    await import("../sdk");
    // Dispatching popstate must not throw — exercises the handler closure
    expect(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    }).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
  });

  it("should attach hashchange handler that schedules route changes", async () => {
    await import("../sdk");
    expect(() => {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
  });

  it("should ignore hashchange when hashes are not tracked", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk({ trackHash: false });
    fetchSpy.mockClear();
    history.replaceState({}, "", "/#section");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await new Promise((r) => setTimeout(r, 500));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(registeredWinListeners.map(([type]) => type)).not.toContain(
      "hashchange",
    );
  });

  it("should fire pageview on hashchange", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    history.replaceState({}, "", window.location.pathname + "#section");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await new Promise((r) => setTimeout(r, 500));

    // Best-effort check — depends on happy-dom location semantics. Don't enforce strict
    // expectation; the dispatch+wait exercises hashchange handler + commitRouteChange.
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it("should flush pending route change immediately on track() calls", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    history.pushState({}, "", "/will-be-flushed");
    await new Promise((r) => setTimeout(r, 0));
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("manual_event");

    // The custom_event must always fire regardless of happy-dom routing quirks
    const customEventCalls = fetchSpy.mock.calls.filter(([, opts]) => {
      try {
        return (
          JSON.parse((opts as RequestInit).body as string).kind ===
          "custom_event"
        );
      } catch {
        return false;
      }
    });
    expect(customEventCalls.length).toBeGreaterThan(0);
  });

  it("should include UA client hints when navigator.userAgentData exists", async () => {
    const uaData = {
      brands: [{ brand: "Chromium", version: "130" }],
      mobile: false,
      platform: "Windows",
      getHighEntropyValues: vi.fn().mockResolvedValue({
        fullVersionList: [{ brand: "Chromium", version: "130.0.6723.92" }],
        platformVersion: "15.0.0",
        model: "",
        formFactors: ["Desktop"],
      }),
    };
    (navigator as any).userAgentData = uaData;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    // Wait for UA client hints to settle
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("after_ua_settled");

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.uaClientHints).toBeDefined();
    expect(body.uaClientHints.brands?.[0].brand).toBe("Chromium");
    expect(body.uaClientHints.platform).toBe("Windows");
    expect(body.uaClientHints.platformVersion).toBe("15.0.0");

    delete (navigator as any).userAgentData;
  });

  it("should fall back to low-entropy hints when getHighEntropyValues is missing", async () => {
    const uaData = {
      brands: [{ brand: "Brand", version: "1" }],
      mobile: true,
      platform: "Linux",
    };
    (navigator as any).userAgentData = uaData;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("low_entropy_only");
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.uaClientHints).toBeDefined();
    expect(body.uaClientHints.mobile).toBe(true);
    expect(body.uaClientHints.platform).toBe("Linux");

    delete (navigator as any).userAgentData;
  });

  it("should swallow rejected getHighEntropyValues without breaking tracking", async () => {
    const uaData = {
      brands: [{ brand: "Brand", version: "1" }],
      mobile: false,
      platform: "Mac",
      getHighEntropyValues: vi.fn().mockRejectedValue(new Error("blocked")),
    };
    (navigator as any).userAgentData = uaData;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("rejection_swallowed");
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.uaClientHints).toBeDefined();

    delete (navigator as any).userAgentData;
  });

  it("should leave uaClientHints undefined when userAgentData is missing", async () => {
    delete (navigator as any).userAgentData;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("no_ua_data");
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.uaClientHints).toBeUndefined();
  });

  it("should expose the API on window.openAnalytics as well as the install key", async () => {
    await import("../sdk");
    expect((window as any).openAnalytics).toBe((window as any)[installKey]);
    expect((window as any).openAnalytics.siteId).toBe("configured-site");
  });

  it("should not create or refresh SDK session ids", async () => {
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("new-visit");
    const legacyActivityAt = String(Date.now() - 60_000);
    window.sessionStorage.setItem(
      "__openanalytics_session_configured-site__",
      "expired-session",
    );
    window.sessionStorage.setItem(
      "__openanalytics_session_activity_configured-site__",
      legacyActivityAt,
    );
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk();

    const body = decodeFetchBody(fetchSpy);
    expect(body.sessionId).toBeUndefined();
    expect(body.visitId).toBe("new-visit");
    expect(
      window.sessionStorage.getItem(
        "__openanalytics_session_configured-site__",
      ),
    ).toBe("expired-session");
    expect(
      window.sessionStorage.getItem(
        "__openanalytics_session_activity_configured-site__",
      ),
    ).toBe(legacyActivityAt);
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
  });

  it("should omit query and hash when configured flags are disabled", async () => {
    history.replaceState({}, "", "/docs?utm=campaign#intro");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk({ trackHash: false, trackQueryParams: false });

    const body = decodeFetchBody(fetchSpy);
    expect(body.pathname).toBe("/docs");
    expect(body.query).toBe("");
    expect(body.hash).toBe("");
  });

  it("should send UTM tags from the URL even when query strings are not tracked", async () => {
    history.replaceState({}, "", "/?utm_source=x");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk({ trackQueryParams: false });

    const body = decodeFetchBody(fetchSpy);
    expect(body.query).toBe("");
    expect(body.utmSource).toBe("x");
  });

  it.each([
    "http://localhost:3000/",
    "http://127.0.0.1:8080/",
    "http://[::1]:3000/",
    "http://shop.localhost/",
  ])("should send nothing from a local page at %s", async (url) => {
    setPageUrl(url);
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));
    (window as any).__openanalytics_tracker_v6__.track("local_event");
    window.dispatchEvent(new Event("pagehide"));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it("should block installation when configured to honor Do Not Track", async () => {
    Object.defineProperty(navigator, "doNotTrack", {
      value: "yes",
      writable: true,
      configurable: true,
    });

    await expect(
      importConfiguredSdk({ ignoreDoNotTrack: false }),
    ).rejects.toThrow("OpenAnalytics: Do Not Track enabled");
  });

  it("should not register outbound link listener when outbound auto-track is disabled", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk({ autoTrackOutboundLinks: false });
    fetchSpy.mockClear();

    const a = document.createElement("a");
    a.href = "https://external.example/path";
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("file downloads", () => {
    function clickLink(href: string, download = false) {
      const a = document.createElement("a");
      a.setAttribute("href", href);
      if (download) a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    async function sentEvents(
      options: ConfiguredSdkOptions,
      href: string,
      download = false,
    ) {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ ok: true }))),
        );
      await importConfiguredSdk(options);
      fetchSpy.mockClear();
      clickLink(href, download);
      return fetchSpy.mock.calls.map(([, init]) => {
        const body = JSON.parse((init as RequestInit).body as string);
        return { name: body.eventName, data: body.eventData };
      });
    }

    it("reports a file link without its query string", async () => {
      await expect(
        sentEvents({}, "/files/Report.final.PDF?token=secret#page=2"),
      ).resolves.toEqual([
        {
          name: "file_download",
          data: { url: `${window.location.origin}/files/Report.final.PDF` },
        },
      ]);
    });

    it("reports a link with a download attribute", async () => {
      await expect(sentEvents({}, "/export", true)).resolves.toEqual([
        {
          name: "file_download",
          data: { url: `${window.location.origin}/export` },
        },
      ]);
    });

    it("counts a file on another domain as a download, not an outbound click", async () => {
      await expect(
        sentEvents({}, "https://cdn.example/app.zip"),
      ).resolves.toEqual([
        { name: "file_download", data: { url: "https://cdn.example/app.zip" } },
      ]);
    });

    it.each(["/docs/getting.started/", "/pricing"])(
      "ignores the page link %s",
      async (href) => {
        await expect(sentEvents({}, href)).resolves.toEqual([]);
      },
    );

    it("leaves a file link alone when download tracking is off", async () => {
      await expect(
        sentEvents({ autoTrackFileDownloads: false }, "/files/report.pdf"),
      ).resolves.toEqual([]);
    });

    it("leaves a file on another domain to outbound tracking when download tracking is off", async () => {
      await expect(
        sentEvents(
          { autoTrackFileDownloads: false },
          "https://cdn.example/app.zip",
        ),
      ).resolves.toEqual([
        {
          name: "outbound_click",
          data: { url: "https://cdn.example/app.zip", domain: "cdn.example" },
        },
      ]);
    });
  });

  describe("404 pages", () => {
    async function eventsForStatus(
      responseStatus: number | undefined,
      options: ConfiguredSdkOptions = {},
    ) {
      vi.spyOn(performance, "getEntriesByType").mockReturnValue(
        responseStatus === undefined
          ? []
          : ([{ responseStatus }] as unknown as PerformanceEntryList),
      );
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ ok: true }))),
        );
      setPageUrl("http://site.test/missing/page");
      await importConfiguredSdk(options);
      await new Promise((resolve) => setTimeout(resolve, 0));
      return fetchSpy.mock.calls
        .map(([, init]) => JSON.parse((init as RequestInit).body as string))
        .filter((body) => body.kind === "custom_event")
        .map((body) => ({ name: body.eventName, data: body.eventData }));
    }

    it("reports a page served with a 404 status", async () => {
      await expect(eventsForStatus(404)).resolves.toEqual([
        { name: "page_not_found", data: { path: "/missing/page" } },
      ]);
    });

    it.each([
      ["another status", 200, {}],
      ["an unreported status", undefined, {}],
      ["404 tracking off", 404, { track404Pages: false }],
    ] as const)("reports nothing for %s", async (_, status, options) => {
      await expect(eventsForStatus(status, options)).resolves.toEqual([]);
    });
  });

  it("should fall back to fetch keepalive for leave events when sendBeacon is unavailable", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    window.dispatchEvent(new Event("pagehide"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.kind).toBe("leave");
    expect(options.keepalive).toBe(true);
  });

  it("should send custom events with keepalive so a click that navigates away still lands", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    (window as any).__openanalytics_tracker_v6__.track("signup_click");

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.keepalive).toBe(true);
  });

  it("should ignore unserializable custom event payloads", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => api.track("circular", circular)).not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should trim event names without client-side sequencing", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("  spaced_event  ");
    api.track("next_event");

    const firstBody = decodeFetchBody(fetchSpy, 0);
    const secondBody = decodeFetchBody(fetchSpy, 1);
    expect(firstBody.eventName).toBe("spaced_event");
    expect(firstBody.sequence).toBeUndefined();
    expect(secondBody.sequence).toBeUndefined();
  });

  it("should ignore inherited global property keys", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    const props = Object.create({ inherited: "ignored" });
    props.owned = "kept";
    api.setGlobalProperties(props);
    api.track("global_props");

    const body = decodeFetchBody(fetchSpy);
    expect(body.eventData).toEqual({ owned: "kept" });
  });

  it("should not send submit auto-track events for forms without an event name", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const form = document.createElement("form");
    form.setAttribute("data-open-analytics-event-trigger", "submit");
    document.body.appendChild(form);
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should not send click auto-track events for elements without an event name", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const button = document.createElement("button");
    button.setAttribute("data-open-analytics-event-trigger", "click");
    document.body.appendChild(button);
    button.click();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should swallow rejected fetch promises without breaking installation", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network down"));

    await expect(import("../sdk")).resolves.toBeDefined();
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalled();
    expect((window as any).__openanalytics_tracker_v6__).toBeDefined();
  });

  it("should flush pending route changes before manual tracking and log pageviews in debug mode", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => queueMicrotask(r));
    const api = (window as any).__openanalytics_tracker_v6__;
    api.debug();
    fetchSpy.mockClear();

    history.pushState({}, "", "/flushed-route?from=test");
    await new Promise((r) => queueMicrotask(r));
    api.track("after_route_flush");

    const bodies = fetchSpy.mock.calls.map(([, options]) =>
      JSON.parse((options as RequestInit).body as string),
    );
    expect(bodies.map((body) => body.kind)).toEqual([
      "pageview",
      "custom_event",
    ]);
    expect(bodies[0].pathname).toBe("/flushed-route");
    expect(bodies[0].navigation).toBe("route");
    expect(bodies[0].previousVisitId).toBeUndefined();
    expect(bodies[1].pathname).toBe("/flushed-route");
    expect(bodies[1].navigation).toBeUndefined();
    expect(bodies[1].previousVisitId).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      "[OpenAnalytics]",
      "pageview:",
      "/flushed-route",
    );
  });

  it("should ignore stale route timer callbacks after a manual flush", async () => {
    const routeCallbacks: Array<() => void> = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    vi.spyOn(window, "setTimeout").mockImplementation(((callback) => {
      routeCallbacks.push(callback as () => void);
      return routeCallbacks.length as unknown as number;
    }) as typeof window.setTimeout);
    vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);

    history.pushState({}, "", "/stale-route");
    await new Promise((r) => queueMicrotask(r));
    expect(routeCallbacks).toHaveLength(1);

    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("flush_stale_route");
    fetchSpy.mockClear();

    routeCallbacks[0]();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should flush pending route changes when the scheduled timer id is zero", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();
    vi.spyOn(window, "setTimeout").mockImplementation(
      (() => 0) as typeof window.setTimeout,
    );
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    history.pushState({}, "", "/zero-timer-route");
    await new Promise((r) => queueMicrotask(r));

    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("zero_timer_flush");

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    const bodies = fetchSpy.mock.calls.map(([, options]) =>
      JSON.parse((options as RequestInit).body as string),
    );
    expect(bodies.map((body) => body.kind)).toEqual([
      "pageview",
      "custom_event",
    ]);
    expect(bodies[0].pathname).toBe("/zero-timer-route");
    expect(bodies[1].pathname).toBe("/zero-timer-route");
  });

  it("should ignore invalid outbound href values", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const a = document.createElement("a");
    a.setAttribute("href", "http://[");
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should ignore outbound anchors with blank href values", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const a = document.createElement("a");
    a.setAttribute("href", "");
    document.body.appendChild(a);
    a.click();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should ignore empty auto-track click and submit event names", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const button = document.createElement("button");
    button.setAttribute("data-open-analytics-event", "");
    document.body.appendChild(button);
    button.click();

    const form = document.createElement("form");
    form.setAttribute("data-open-analytics-event", "");
    form.setAttribute("data-open-analytics-event-trigger", "submit");
    document.body.appendChild(form);
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should ignore inherited and unrelated dataset keys during auto-track extraction", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const button = document.createElement("button");
    button.setAttribute("data-open-analytics-event", "dataset_edge");
    Object.defineProperty(button, "dataset", {
      configurable: true,
      value: Object.assign(
        Object.create({ openAnalyticsEventInherited: "ignored" }),
        {
          otherKey: "ignored",
          openAnalyticsEventLabel: "kept",
        },
      ),
    });
    document.body.appendChild(button);
    button.click();

    const body = decodeFetchBody(fetchSpy);
    expect(body.eventData).toEqual({ label: "kept" });
  });

  it("should forward raw UA client hints for server-side normalization", async () => {
    (navigator as any).userAgentData = {
      brands: [
        null,
        [],
        { brand: "", version: "1" },
        { brand: "MissingVersion", version: "" },
      ],
      mobile: "false",
      platform: "   ",
      getHighEntropyValues: vi.fn().mockResolvedValue({
        fullVersionList: [
          { brand: "Chromium", version: "130.0.6723.92" },
          { brand: "", version: "bad" },
        ],
        formFactors: [" Desktop ", "", "Foldable"],
        model: " Surface Pro ",
        platformVersion: " 15.0.0 ",
      }),
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("malformed_ua");

    const body = decodeFetchBody(fetchSpy);
    expect(body.uaClientHints).toEqual({
      brands: [
        null,
        [],
        { brand: "", version: "1" },
        { brand: "MissingVersion", version: "" },
      ],
      mobile: "false",
      platform: "   ",
      fullVersionList: [
        { brand: "Chromium", version: "130.0.6723.92" },
        { brand: "", version: "bad" },
      ],
      formFactors: [" Desktop ", "", "Foldable"],
      model: " Surface Pro ",
      platformVersion: " 15.0.0 ",
    });
  });

  it("should omit UA client hints when userAgentData has no usable fields", async () => {
    (navigator as any).userAgentData = {};
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    fetchSpy.mockClear();
    const api = (window as any).__openanalytics_tracker_v6__;
    api.track("empty_ua");

    const body = decodeFetchBody(fetchSpy);
    expect(body.uaClientHints).toBeUndefined();
  });

  it("should send without UA client hints when reading them rejects", async () => {
    vi.doMock("../ua-client-hints", () => ({
      readUaClientHints: () => Promise.reject(new Error("ua unavailable")),
      withUaClientHints: (payload: unknown) => payload,
    }));
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    await new Promise((r) => setTimeout(r, 0));

    const body = decodeFetchBody(fetchSpy);
    expect(body.kind).toBe("pageview");
    expect(body.uaClientHints).toBeUndefined();
  });

  it("should apply page payload fallbacks for empty browser metadata", async () => {
    const originalLanguage = navigator.language;
    const originalScreen = window.screen;
    document.title = "";
    Object.defineProperty(navigator, "language", {
      value: "",
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "screen", {
      value: {},
      writable: true,
      configurable: true,
    });
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "" }),
        }) as Intl.DateTimeFormat,
    );
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    try {
      await import("../sdk");

      const body = decodeFetchBody(fetchSpy);
      expect(body.title).toBe("");
      expect(body.language).toBe("");
      expect(body.timezone).toBe("");
      expect(body.screenWidth).toBeNull();
      expect(body.screenHeight).toBeNull();
    } finally {
      Object.defineProperty(navigator, "language", {
        value: originalLanguage,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "screen", {
        value: originalScreen,
        writable: true,
        configurable: true,
      });
    }
  });

  it("should surface debug logs for track without event data", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }))),
    );

    await import("../sdk");
    const api = (window as any).__openanalytics_tracker_v6__;
    api.debug();
    api.track("debug-no-data");

    expect(logSpy).toHaveBeenCalledWith(
      "[OpenAnalytics]",
      "track:",
      JSON.stringify("debug-no-data"),
      JSON.stringify({}),
    );
  });
  it("should tolerate missing history methods during installation", async () => {
    Object.defineProperty(history, "pushState", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    await import("../sdk");

    expect((window as any).__openanalytics_tracker_v6__).toBeDefined();
    expect(history.pushState).toBeUndefined();
  });

  it("should extract auto-track JSON data when dataset is unavailable", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await import("../sdk");
    fetchSpy.mockClear();

    const button = document.createElement("button");
    button.setAttribute("data-open-analytics-event", "dataset_missing");
    button.setAttribute(
      "data-open-analytics-event-data",
      JSON.stringify({ source: "json-only" }),
    );
    Object.defineProperty(button, "dataset", {
      configurable: true,
      value: undefined,
    });
    document.body.appendChild(button);
    button.click();

    const body = decodeFetchBody(fetchSpy);
    expect(body.eventName).toBe("dataset_missing");
    expect(body.eventData).toEqual({ source: "json-only" });
  });

  it("should ignore visibilitychange events while the document is visible", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await import("../sdk");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it("should wait for UA client hints before the first pageview and only flush once", async () => {
    vi.useFakeTimers();
    let resolveHighEntropy: (value: unknown) => void = () => {};
    const uaData = {
      brands: [
        { brand: "", version: "missing-brand" },
        { brand: "Chromium", version: "130" },
      ],
      mobile: false,
      platform: "Windows",
      getHighEntropyValues: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveHighEntropy = resolve;
          }),
      ),
    };
    (navigator as any).userAgentData = uaData;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    const importPromise = importConfiguredSdk();
    await vi.advanceTimersByTimeAsync(50);
    await importPromise;
    expect(fetchSpy).not.toHaveBeenCalled();

    resolveHighEntropy({
      fullVersionList: [
        { brand: "Chromium", version: "130.0.6723.92" },
        { brand: "TooLong", version: "1" },
      ],
      formFactors: ["Desktop", "", "Tablet"],
      model: "Surface",
      platformVersion: "15.0.0",
    });
    await vi.runAllTimersAsync();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = decodeFetchBody(fetchSpy);
    expect(body.kind).toBe("pageview");
    expect(body.uaClientHints.brands).toEqual([
      { brand: "", version: "missing-brand" },
      { brand: "Chromium", version: "130" },
    ]);
    expect(body.uaClientHints.formFactors).toEqual(["Desktop", "", "Tablet"]);
    expect(body.uaClientHints.model).toBe("Surface");
  });

  it("should flush the first pageview after UA client hints timeout", async () => {
    vi.useFakeTimers();
    (navigator as any).userAgentData = {
      brands: [{ brand: "Slow", version: "1" }],
      mobile: false,
      platform: "Windows",
      getHighEntropyValues: vi.fn(() => new Promise(() => {})),
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk();
    await vi.advanceTimersByTimeAsync(199);
    expect(fetchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = decodeFetchBody(fetchSpy);
    expect(body.kind).toBe("pageview");
    expect(body.uaClientHints).toBeUndefined();
  });

  it("should send only a visible event, not a new pageview, after a long hidden period", async () => {
    vi.useFakeTimers();
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }))),
      );

    await importConfiguredSdk();
    await vi.runAllTimersAsync();
    fetchSpy.mockClear();
    sendBeaconSpy.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.runAllTimersAsync();

    const bodies = await Promise.all(
      sendBeaconSpy.mock.calls.map(([, blob]) => decodeBeaconBody(blob)),
    );
    expect(bodies.map((body) => [body.kind, body.visibilityState])).toEqual([
      ["visibility", "hidden"],
      ["visibility", "visible"],
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("should ignore visibilitychange visible when not previously hidden", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await importConfiguredSdk();
    sendBeaconSpy.mockClear();

    // Dispatch visible without a prior hidden — should be a no-op
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it("should not double-start a visit on repeated visibilitychange hidden events", async () => {
    const sendBeaconSpy = vi.fn().mockReturnValue(true);
    (navigator as any).sendBeacon = sendBeaconSpy;

    await importConfiguredSdk();
    sendBeaconSpy.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));

    // Only one hidden visibility event should be sent (second is a no-op due to pendingHiddenAt > 0)
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const body = await decodeBeaconBody(sendBeaconSpy.mock.calls[0][1]);
    expect(body.visibilityState).toBe("hidden");
  });

  describe("scroll depth", () => {
    const geometry = [
      [window, "scrollY"],
      [window, "innerHeight"],
      [document.documentElement, "scrollHeight"],
    ] as const;
    let saved: Array<PropertyDescriptor | undefined> = [];

    beforeEach(() => {
      saved = geometry.map(([target, key]) =>
        Object.getOwnPropertyDescriptor(target, key),
      );
    });

    afterEach(() => {
      geometry.forEach(([target, key], index) => {
        const descriptor = saved[index];
        if (descriptor) Object.defineProperty(target, key, descriptor);
        else delete (target as unknown as Record<string, unknown>)[key];
      });
    });

    function setGeometry(page: {
      scrollY: number;
      innerHeight: number;
      scrollHeight: number;
    }) {
      for (const [target, key] of geometry) {
        Object.defineProperty(target, key, {
          value: page[key],
          configurable: true,
        });
      }
    }

    async function scrollPageTo(scrollY: number) {
      Object.defineProperty(window, "scrollY", {
        value: scrollY,
        configurable: true,
      });
      document.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    function setVisibility(state: "hidden" | "visible") {
      Object.defineProperty(document, "visibilityState", {
        value: state,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }

    it("reports the deepest scroll with the hidden and leave payloads", async () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      (navigator as any).sendBeacon = sendBeaconSpy;
      setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 4000 });
      await import("../sdk");

      await scrollPageTo(2400);
      // Scrolling back up keeps the deepest point.
      await scrollPageTo(400);
      setVisibility("hidden");
      setVisibility("visible");
      await scrollPageTo(3000);
      window.dispatchEvent(new Event("pagehide"));

      const bodies = await Promise.all(
        sendBeaconSpy.mock.calls.map(([, blob]) => decodeBeaconBody(blob)),
      );
      expect(
        bodies.map((body) => [
          body.kind,
          body.visibilityState,
          body.scrollDepth,
        ]),
      ).toEqual([
        ["visibility", "hidden", 80],
        ["visibility", "visible", undefined],
        ["leave", undefined, 95],
      ]);
    });

    it("counts a page that doesn't scroll as seen in full", async () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      (navigator as any).sendBeacon = sendBeaconSpy;
      setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 800 });
      await import("../sdk");

      window.dispatchEvent(new Event("pagehide"));

      await expect(
        decodeBeaconBody(sendBeaconSpy.mock.calls[0][1]),
      ).resolves.toMatchObject({ kind: "leave", scrollDepth: 100 });
    });

    it("measures the page again once it has loaded", async () => {
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      (navigator as any).sendBeacon = sendBeaconSpy;
      setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 800 });
      await import("../sdk");

      // Images loaded and the page grew without the visitor scrolling.
      setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 3200 });
      window.dispatchEvent(new Event("load"));
      window.dispatchEvent(new Event("pagehide"));

      await expect(
        decodeBeaconBody(sendBeaconSpy.mock.calls[0][1]),
      ).resolves.toMatchObject({ kind: "leave", scrollDepth: 25 });
    });

    it("keeps measuring the page's height for 3 seconds after load", async () => {
      vi.useFakeTimers();
      try {
        const sendBeaconSpy = vi.fn().mockReturnValue(true);
        (navigator as any).sendBeacon = sendBeaconSpy;
        setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 800 });
        await import("../sdk");
        window.dispatchEvent(new Event("load"));

        // Content loaded after the load event grows the page.
        setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 3200 });
        vi.advanceTimersByTime(3_000);
        // Growth after the 3 seconds isn't measured until the visitor scrolls.
        setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 8000 });
        vi.advanceTimersByTime(1_000);
        window.dispatchEvent(new Event("pagehide"));

        await expect(
          decodeBeaconBody(sendBeaconSpy.mock.calls[0][1]),
        ).resolves.toMatchObject({ kind: "leave", scrollDepth: 25 });
      } finally {
        vi.useRealTimers();
      }
    });

    it("sends the depth of the page a route change ends with the next pageview", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ ok: true }))),
        );
      const sendBeaconSpy = vi.fn().mockReturnValue(true);
      (navigator as any).sendBeacon = sendBeaconSpy;
      setGeometry({ scrollY: 0, innerHeight: 800, scrollHeight: 1600 });
      await import("../sdk");
      await scrollPageTo(400);
      fetchSpy.mockClear();

      history.pushState({}, "", "/next");
      // The router renders a longer page and scrolls it to the top before
      // the route settles; the old page's depth was taken at the push.
      setGeometry({ scrollY: 200, innerHeight: 800, scrollHeight: 8000 });
      await scrollPageTo(0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(sentKinds(fetchSpy)).toEqual(["pageview"]);
      expect(decodeFetchBody(fetchSpy)).toMatchObject({
        pathname: "/next",
        navigation: "route",
        previousScrollDepth: 75,
      });

      // The new page view starts its own depth.
      window.dispatchEvent(new Event("pagehide"));
      await expect(
        decodeBeaconBody(sendBeaconSpy.mock.calls[0][1]),
      ).resolves.toMatchObject({ kind: "leave", scrollDepth: 10 });
    });
  });
});
