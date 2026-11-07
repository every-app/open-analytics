export type TeamRole = "owner" | "admin" | "member";

export function toTeamRole(value: unknown): TeamRole {
  const s = String(value ?? "member").toLowerCase();
  if (s === "owner") return "owner";
  if (s === "admin") return "admin";
  return "member";
}

/**
 * Who manages sites, goals, funnels, public sharing and System settings: the
 * organization's owners and admins, by their gateway role. Members read every
 * dashboard and manage only their own account, saved filters, inbox and
 * notification rules.
 */
export function canManageTeam(
  role: TeamRole | string | undefined | null,
): boolean {
  return toTeamRole(role) !== "member";
}
