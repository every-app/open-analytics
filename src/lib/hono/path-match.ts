export function shouldUseHono(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/collect" ||
    pathname === "/script.js" ||
    pathname === "/healthz"
  );
}
