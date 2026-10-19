import { type ReactNode, useState } from "react";
import { Button, buttonVariants } from "@insightflare/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";

import {
  buildSettingsPath,
  buildSitePath,
  type SettingsSection,
} from "@/lib/dashboard/paths";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type {
  GetStartedData,
  GetStartedStepId,
} from "@/lib/edge/admin/setup/get-started";
import { formatI18nTemplate } from "@/lib/i18n/template";
import Link from "@/lib/router";
import { cn } from "@/lib/utils";

import { useTeamManagementContext } from "./context";
import { STEP_ILLUSTRATIONS } from "./step-illustrations";

// Folded away in this browser: the header and its progress stay.
const COLLAPSED_KEY = "open-analytics:get-started-collapsed";

/** Where a step leads: a page here, the gateway, or the create-site dialog. */
type StepTarget =
  | { kind: "href"; href: string }
  | { kind: "external"; href: string }
  | { kind: "action"; onClick: () => void };

/**
 * All sites' Get started card: the next three steps as cards, how many are
 * done, and the done ones folded underneath. Gone once every step is done.
 */
export function GetStartedCard() {
  const { canManage, locale, messages, dashboardSites, openCreateSiteDialog } =
    useTeamManagementContext();
  const { teamContext } = useRouteContext({ from: "/$locale/app" });
  const copy = messages.getStarted;
  const query = useQuery({
    queryKey: ["dashboard", "get-started"],
    queryFn: ({ signal }) =>
      requestAdminService<GetStartedData>("get-started", { signal }),
    enabled: canManage && typeof window !== "undefined",
  });
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(COLLAPSED_KEY) === "1",
  );
  const [showDone, setShowDone] = useState(false);

  const steps = query.data?.steps ?? [];
  const done = steps.filter((step) => step.done);
  const next = steps.filter((step) => !step.done).slice(0, 3);
  if (!canManage || next.length === 0) return null;

  const firstSite = dashboardSites[0];
  const settings = (section: SettingsSection): StepTarget => ({
    kind: "href",
    href: buildSettingsPath(locale, section),
  });
  const siteSettings: StepTarget = firstSite
    ? { kind: "href", href: buildSitePath(locale, firstSite.slug, "settings") }
    : settings("sites");
  const targets: Record<GetStartedStepId, StepTarget> = {
    site: { kind: "action", onClick: openCreateSiteDialog },
    tracking: siteSettings,
    team: {
      kind: "external",
      href: `${teamContext.gatewayUrl.replace(/\/$/, "")}/admin/users`,
    },
    notifications: settings("notifications"),
    sharing: siteSettings,
  };

  const toggle = () => {
    const value = !collapsed;
    setCollapsed(value);
    window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  };

  return (
    <section
      aria-labelledby="get-started-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <header className="flex items-center justify-between gap-4">
        <h2
          id="get-started-title"
          className="text-xl font-semibold tracking-tight"
        >
          {copy.title}
        </h2>
        <div className="flex items-center gap-3">
          <ProgressRing done={done.length} total={steps.length} />
          <span className="text-sm whitespace-nowrap tabular-nums">
            {formatI18nTemplate(copy.progress, {
              done: done.length,
              total: steps.length,
            })}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={!collapsed}
            aria-controls="get-started-steps"
            aria-label={collapsed ? copy.showSteps : copy.hideSteps}
            onClick={toggle}
          >
            <ChevronUpIcon
              className={cn("transition-transform", collapsed && "rotate-180")}
            />
          </Button>
        </div>
      </header>

      {collapsed ? null : (
        <div id="get-started-steps">
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {next.map((step) => (
              <StepCard
                key={step.id}
                id={step.id}
                number={steps.indexOf(step) + 1}
                title={copy.steps[step.id]}
                target={targets[step.id]}
              />
            ))}
          </ol>
          {done.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={showDone}
                aria-controls="get-started-done"
                onClick={() => setShowDone((value) => !value)}
                className="flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CheckIcon className="size-4 text-success" aria-hidden />
                {formatI18nTemplate(copy.completed, { count: done.length })}
                <ChevronRightIcon
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    showDone && "rotate-90",
                  )}
                  aria-hidden
                />
              </button>
              {showDone ? (
                <ul id="get-started-done" className="mt-3 space-y-2">
                  {done.map((step) => (
                    <li
                      key={step.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckIcon className="size-4 text-success" aria-hidden />
                      {copy.steps[step.id]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StepCard({
  id,
  number,
  title,
  target,
}: {
  id: GetStartedStepId;
  number: number;
  title: string;
  target: StepTarget;
}) {
  const Illustration = STEP_ILLUSTRATIONS[id];
  return (
    <li className="relative overflow-hidden rounded-xl bg-foreground/[0.04] md:min-h-56 dark:bg-foreground/[0.06]">
      <StepLink target={target}>
        <span className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-sm font-medium shadow-xs">
            {number}
          </span>
          <span className="min-w-0 pt-1.5 text-left leading-tight font-semibold">
            {title}
          </span>
        </span>
        <span className="hidden md:contents">
          <Illustration />
        </span>
        <span
          aria-hidden
          className={cn(
            buttonVariants({ size: "icon" }),
            "relative ml-auto shrink-0 group-hover/step:bg-primary/80 md:mt-auto md:ml-0",
          )}
        >
          <ArrowRightIcon />
        </span>
      </StepLink>
    </li>
  );
}

// A row on phones; from md up, a tall card with the picture and the arrow
// at its foot.
const STEP_LINK_CLASS =
  "group/step flex h-full w-full items-center gap-4 rounded-xl p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-56 md:flex-col md:items-stretch md:p-5";

/** The whole card is the step's link, or its button. */
function StepLink({
  target,
  children,
}: {
  target: StepTarget;
  children: ReactNode;
}) {
  if (target.kind === "action") {
    return (
      <button
        type="button"
        onClick={target.onClick}
        className={cn(STEP_LINK_CLASS, "cursor-pointer")}
      >
        {children}
      </button>
    );
  }
  if (target.kind === "external") {
    return (
      <a
        href={target.href}
        target="_blank"
        rel="noreferrer"
        className={STEP_LINK_CLASS}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={target.href} className={STEP_LINK_CLASS}>
      {children}
    </Link>
  );
}

/** A ring that fills as steps are done. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const share = total === 0 ? 0 : done / total;
  return (
    <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="3"
        className="stroke-foreground/10"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - share)}
        className="stroke-primary transition-[stroke-dashoffset]"
      />
    </svg>
  );
}
