import { useRef, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { Input } from "@insightflare/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { BlockingRuleGeoSearchDialog } from "@/components/dashboard/admin/blocking-rule-geo-search-dialog";
import { SaveButton } from "@/components/settings/save-button";
import {
  SettingsCard,
  SettingsCardFooter,
} from "@/components/settings/settings-section";
import {
  BLOCKING_FIELD_IDS,
  type BlockingFieldId,
  type BlockingRuleAction,
} from "@/lib/blocking";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type { SiteSettingsConfig } from "@/lib/site-settings";

import {
  type BlockingRuleRow,
  blockingRuleRows,
  blockingRulesPatch,
  invalidBlockingRules,
  postJson,
} from "./settings-model";

const ACTIONS: readonly BlockingRuleAction[] = ["block", "allow"];

function isGeoField(field: BlockingFieldId): field is "countries" | "regions" {
  return field === "countries" || field === "regions";
}

/**
 * A site's blocking rules as one list: each rule a type, block or allow,
 * and a value. Saving replaces every rule the site has.
 */
export function BlockingRulesList({
  locale,
  messages,
  siteId,
  config,
  disabled,
  onSaved,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  config: SiteSettingsConfig | undefined;
  disabled: boolean;
  onSaved: (saved: SiteSettingsConfig) => void;
}) {
  const copy = messages.siteSettings;
  // Each rule type's name and example value.
  const fieldCopy = (field: BlockingFieldId) => copy.blockingRulesFields[field];
  const idCounter = useRef(0);
  const nextId = () => `blocking-rule-${idCounter.current++}`;
  const [rows, setRows] = useState<BlockingRuleRow[]>(() =>
    blockingRuleRows(config, nextId),
  );
  const [changed, setChanged] = useState(false);
  const [invalidIds, setInvalidIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [searchRowId, setSearchRowId] = useState<string | null>(null);
  const searchRow = rows.find((row) => row.id === searchRowId);

  function update(id: string, patch: Partial<Omit<BlockingRuleRow, "id">>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setChanged(true);
    setInvalidIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function add() {
    setRows((current) => [
      ...current,
      {
        id: nextId(),
        field: BLOCKING_FIELD_IDS[0],
        action: "block",
        value: "",
      },
    ]);
    setChanged(true);
  }

  function remove(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setChanged(true);
  }

  async function save() {
    const invalid = invalidBlockingRules(rows);
    setInvalidIds(invalid.rowIds);
    const tooMany = invalid.tooManyFields[0];
    if (tooMany) {
      toast.error(
        formatI18nTemplate(copy.blockingRulesTooMany, {
          type: fieldCopy(tooMany).title,
        }),
      );
      return;
    }
    if (invalid.rowIds.size > 0) {
      toast.error(copy.blockingRuleInvalid);
      return;
    }
    setSaving(true);
    try {
      const saved = await postJson<SiteSettingsConfig>("site-config", {
        siteId,
        config: {},
        blockingPatch: blockingRulesPatch(rows),
      });
      setRows(blockingRuleRows(saved, nextId));
      setChanged(false);
      onSaved(saved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.toasts.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  const locked = disabled || saving;

  return (
    <SettingsCard>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {copy.blockingRulesEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const invalid = invalidIds.has(row.id);
            return (
              <li key={row.id} className="space-y-1.5 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <Select
                    value={row.field}
                    disabled={locked}
                    onValueChange={(value) =>
                      update(row.id, { field: value as BlockingFieldId })
                    }
                  >
                    <SelectTrigger
                      aria-label={copy.blockingRuleTypeLabel}
                      className="w-full sm:w-44"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCKING_FIELD_IDS.map((field) => (
                        <SelectItem key={field} value={field}>
                          {fieldCopy(field).title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.action}
                    disabled={locked}
                    onValueChange={(value) =>
                      update(row.id, { action: value as BlockingRuleAction })
                    }
                  >
                    <SelectTrigger
                      aria-label={copy.blockingRuleActionLabel}
                      className="w-28"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action === "block"
                            ? copy.blockingRuleBlock
                            : copy.blockingRuleAllow}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={copy.blockingRuleValueLabel}
                    aria-invalid={invalid}
                    className="min-w-0 flex-1 font-mono text-xs"
                    value={row.value}
                    placeholder={fieldCopy(row.field).placeholder}
                    disabled={locked}
                    onChange={(event) =>
                      update(row.id, { value: event.target.value })
                    }
                  />
                  {isGeoField(row.field) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={copy.blockingRulesDialogs.searchButton}
                      title={copy.blockingRulesDialogs.searchButton}
                      disabled={locked}
                      onClick={() => setSearchRowId(row.id)}
                    >
                      <SearchIcon />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={copy.blockingRuleRemove}
                    title={copy.blockingRuleRemove}
                    disabled={locked}
                    onClick={() => remove(row.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                {invalid ? (
                  <p role="alert" className="text-xs text-destructive">
                    {copy.blockingRuleInvalid}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <SettingsCardFooter
        note={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked}
            onClick={add}
          >
            <PlusIcon data-icon="inline-start" />
            {copy.blockingRuleAdd}
          </Button>
        }
      >
        <SaveButton
          type="button"
          label={copy.blockingRulesSave}
          savingLabel={copy.saving}
          saving={saving}
          disabled={disabled || !changed}
          onClick={() => void save()}
        />
      </SettingsCardFooter>
      {searchRow && isGeoField(searchRow.field) ? (
        <BlockingRuleGeoSearchDialog
          field={searchRow.field}
          title={fieldCopy(searchRow.field).title}
          locale={locale}
          copy={copy.blockingRulesDialogs}
          open
          onOpenChange={(open) => {
            if (!open) setSearchRowId(null);
          }}
          onSelect={(value) => update(searchRow.id, { value })}
        />
      ) : null}
    </SettingsCard>
  );
}
