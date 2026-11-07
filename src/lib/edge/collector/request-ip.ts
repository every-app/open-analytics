function normalizeIp(ip: string): string {
  return ip.trim().slice(0, 80);
}

export function requestIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return normalizeIp(cfIp);
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  if (forwarded) return normalizeIp(forwarded.split(",")[0] || "");
  const realIp = request.headers.get("x-real-ip")?.trim();
  // Local Workers and self-hosted deployments can lack a forwarding header.
  return realIp ? normalizeIp(realIp) : "0.0.0.0";
}
