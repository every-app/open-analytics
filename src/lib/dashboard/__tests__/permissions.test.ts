import { describe, expect, it } from "vitest";

import { canManageTeam, toTeamRole } from "@/lib/dashboard/permissions";

describe("Dashboard Permissions Authorization", () => {
  describe("toTeamRole", () => {
    it("should parse exact roles regardless of casing, but will not trim whitespace", () => {
      expect(toTeamRole("owner")).toBe("owner");
      expect(toTeamRole("OWNER")).toBe("owner");
      expect(toTeamRole("Admin")).toBe("admin");
      expect(toTeamRole("MEMBER")).toBe("member");
      // Spaced input falls back to member in production due to lack of trim
      expect(toTeamRole("  OWNER  ")).toBe("member");
    });

    it("should fall back to member for invalid roles, null or undefined", () => {
      expect(toTeamRole("guest")).toBe("member");
      expect(toTeamRole(null)).toBe("member");
      expect(toTeamRole(undefined)).toBe("member");
      expect(toTeamRole({})).toBe("member");
    });
  });

  describe("canManageTeam", () => {
    it("lets the organization's owners and admins manage", () => {
      expect(canManageTeam("owner")).toBe(true);
      expect(canManageTeam("ADMIN")).toBe(true);
    });

    it("keeps members, unknown roles and a missing role read-only", () => {
      expect(canManageTeam("member")).toBe(false);
      expect(canManageTeam("guest")).toBe(false);
      expect(canManageTeam(null)).toBe(false);
      expect(canManageTeam(undefined)).toBe(false);
    });
  });
});
