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
import { toast } from "sonner";

import { getSiteSlug } from "@/components/dashboard/admin/team-management/model";
import { buildSitePath } from "@/lib/dashboard/paths";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { navigateWithTransition } from "@/lib/page-transition";
import { useRouter } from "@/lib/router";

/** Adds a site to the organization, then opens its overview, which shows
 * the tracking snippet until the first page view arrives. */
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
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [error, setError] = useState("");

  async function handleCreateSite() {
    if (name.trim().length < 2 || domain.trim().length < 3) {
      setError(t.invalidInput);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await requestAdminService<SiteData>("sites", {
        method: "POST",
        body: {
          teamId,
          name: name.trim(),
          domain: domain.trim(),
          publicSlug: publicSlug.trim() || undefined,
        },
      });
      setName("");
      setDomain("");
      setPublicSlug("");
      onOpenChange(false);
      toast.success(t.createSuccess);
      // A new site's overview shows the tracking snippet until data arrives.
      navigateWithTransition(router, buildSitePath(locale, getSiteSlug(data)));
      router.refresh();
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
          <DialogTitle>{t.createTitle}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateSite();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="create-site-name">{t.name}</Label>
            <Input
              id="create-site-name"
              value={name}
              minLength={2}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-site-domain">{t.domain}</Label>
            <Input
              id="create-site-domain"
              value={domain}
              minLength={3}
              placeholder="example.com"
              required
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-site-public-slug">{t.publicSlug}</Label>
            <Input
              id="create-site-public-slug"
              value={publicSlug}
              onChange={(event) => setPublicSlug(event.target.value)}
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
