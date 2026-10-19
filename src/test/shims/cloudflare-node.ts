// The Every App SDK's Node bridge imports cloudflare:node lazily; nothing
// under test serves a Node framework.
export function handleAsNodeRequest(): never {
  throw new Error("cloudflare:node is not available under Vitest");
}
