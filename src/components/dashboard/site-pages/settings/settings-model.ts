import {
  BLOCKING_FIELD_IDS,
  type BlockingFieldId,
  type BlockingRuleAction,
  type BlockingRulesV2Values,
  parseBlockingRules,
  validateBlockingRules,
} from "@/lib/blocking";
import type { SiteSettingsInitialData } from "@/lib/dashboard/management-data";
import {
  type AdminServiceHttpMethod,
  requestAdminService,
} from "@/lib/dashboard-api/client/admin-service";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { AdminServiceRoute } from "@/lib/dashboard-api/contract/admin-service";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
export interface SiteSettingsClientPageProps {
  locale: Locale;
  messages: AppMessages;
  siteSlug: string;
  site: Pick<
    SiteData,
    "id" | "name" | "domain" | "publicEnabled" | "publicSlug"
  >;
  /** Whether the viewer can open System health, where blocked requests show. */
  canViewSystemHealth: boolean;
  initialData?: SiteSettingsInitialData | null;
}
function safeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function resolveSiteSlug(
  site: Pick<SiteData, "id" | "name" | "domain" | "publicSlug">,
): string {
  const candidate = safeSlug(String(site.domain || "").trim());
  if (candidate.length > 0) return candidate;
  return site.id.slice(0, 8);
}
export function randomPublicSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint8Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}
export function formatSampleRateValue(value: number): string {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted}%`;
}
export async function postJson<T>(
  route: AdminServiceRoute,
  body: Record<string, unknown>,
  method: AdminServiceHttpMethod = "POST",
): Promise<T> {
  return requestAdminService<T>(route, { method, body });
}

/**
 * One blocking rule as the list edits it. A field's rules are stored as
 * lines, `-` marking an allow rule; the list keeps their order per field.
 */
export interface BlockingRuleRow {
  id: string;
  field: BlockingFieldId;
  action: BlockingRuleAction;
  value: string;
}

/** The rules in a site's config, in field order; comments are dropped. */
export function blockingRuleRows(
  config: unknown,
  nextId: () => string,
): BlockingRuleRow[] {
  const parsed = parseBlockingRules(config);
  return BLOCKING_FIELD_IDS.flatMap((field) =>
    parsed.fields[field].lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const allow = line.startsWith("-");
        return {
          id: nextId(),
          field,
          action: allow ? ("allow" as const) : ("block" as const),
          value: (allow ? line.slice(1) : line).trim(),
        };
      }),
  );
}

/** Every field's lines, for a patch that replaces all of the site's rules. */
export function blockingRulesPatch(
  rows: readonly BlockingRuleRow[],
): Record<BlockingFieldId, string[]> {
  return Object.fromEntries(
    BLOCKING_FIELD_IDS.map((field) => [
      field,
      rows
        .filter((row) => row.field === field && row.value.trim().length > 0)
        .map(
          (row) => `${row.action === "allow" ? "-" : ""}${row.value.trim()}`,
        ),
    ]),
  ) as Record<BlockingFieldId, string[]>;
}

/**
 * The rules the parser rejects, by row id, and the fields with more rules
 * than it allows.
 */
export function invalidBlockingRules(rows: readonly BlockingRuleRow[]): {
  rowIds: ReadonlySet<string>;
  tooManyFields: readonly BlockingFieldId[];
} {
  const patch: BlockingRulesV2Values = blockingRulesPatch(rows);
  const rowIds = new Set<string>();
  const tooManyFields: BlockingFieldId[] = [];
  for (const field of BLOCKING_FIELD_IDS) {
    const fieldRows = rows.filter(
      (row) => row.field === field && row.value.trim().length > 0,
    );
    const errors = validateBlockingRules({
      blockingRules: [{ version: 2, data: { [field]: patch[field] } }],
    });
    for (const error of errors) {
      if (error.code === "too_many_lines") tooManyFields.push(field);
      const row = error.line ? fieldRows[error.line - 1] : undefined;
      if (row) rowIds.add(row.id);
    }
  }
  return { rowIds, tooManyFields };
}
