import { useState } from "react";
import { Button } from "@insightflare/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@insightflare/ui/dialog";
import { Input } from "@insightflare/ui/input";
import { Label } from "@insightflare/ui/label";
import { Spinner } from "@insightflare/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { getSiteSlug } from "@/components/dashboard/admin/team-management/model";
import { buildSitePath } from "@/lib/dashboard/paths";
import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { useRouter } from "@/lib/router";
import { normalizeSiteDomain } from "@/lib/site-settings";

/** Adds a site to the organization from its domain, then opens its
 * overview, which shows the tracking snippet until the first page view
 * arrives. The name is optional: the server names the site after its domain. */
export function CreateSiteDialog({
  open,
  onOpenChange,
  locale,
  messages,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  messages: AppMessages;
  teamId: string;
}) {
  const t = messages.adminSites;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");

  async function handleCreateSite() {
    const normalizedDomain = normalizeSiteDomain(domain);
    if (!normalizedDomain) {
      setError(t.invalidDomain);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await requestAdminService<SiteData>("sites", {
        method: "POST",
        body: { teamId, name: name.trim(), domain: normalizedDomain },
      });
      setName("");
      setDomain("");
      onOpenChange(false);
      toast.success(t.createSuccess);
      // The sidebar, All sites and Get started all list the new site.
      queryClient.removeQueries({
        queryKey: dashboardShellQueryOptions.queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "team-dashboard"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", "get-started"],
      });
      // A new site's overview shows the tracking snippet until data arrives.
      await router.push(buildSitePath(locale, getSiteSlug(data)));
    } catch (cause) {
      setError(
        (cause instanceof Error ? cause.message : t.createFailed) ||
          t.createFailed,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return;
        onOpenChange(next);
        if (!next) setError("");
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle icon={PlusIcon}>{t.createTitle}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateSite();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="create-site-domain">{t.domain}</Label>
            <Input
              id="create-site-domain"
              value={domain}
              placeholder="example.com"
              autoComplete="off"
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-site-name">{t.name}</Label>
            <Input
              id="create-site-name"
              value={name}
              placeholder={normalizeSiteDomain(domain) || undefined}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              {messages.settingsNav.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
