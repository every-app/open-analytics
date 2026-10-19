export type SystemRole = "admin" | "user";

export type TeamRole = "owner" | "admin" | "member";

export function toTeamRole(value: unknown): TeamRole {
  const s = String(value ?? "member").toLowerCase();
  if (s === "owner") return "owner";
  if (s === "admin") return "admin";
  return "member";
}

/** Organization owners and admins manage sites, notifications and settings. */
export function canManageTeam(
  role: TeamRole | string | undefined | null,
  systemRole: SystemRole,
): boolean {
  if (systemRole === "admin") return true;
  const r = toTeamRole(role);
  return r === "owner" || r === "admin";
}
