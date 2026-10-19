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
    it("should always grant manage permission to system-level admins", () => {
      expect(canManageTeam("member", "admin")).toBe(true);
      expect(canManageTeam("guest", "admin")).toBe(true);
      expect(canManageTeam(null, "admin")).toBe(true);
    });

    it("should grant manage permission only to owners and admins if not system admin", () => {
      expect(canManageTeam("owner", "user")).toBe(true);
      expect(canManageTeam("admin", "user")).toBe(true);
      expect(canManageTeam("member", "user")).toBe(false);
      expect(canManageTeam("guest", "user")).toBe(false);
      expect(canManageTeam(null, "user")).toBe(false);
    });
  });
});
