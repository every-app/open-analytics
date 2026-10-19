import {
  BadgeDollarSignIcon,
  CircleDollarSignIcon,
  CircleHelpIcon,
  LinkIcon,
  MailIcon,
  MegaphoneIcon,
  MousePointerIcon,
  SearchIcon,
  ShareIcon,
  TagIcon,
} from "lucide-react";

import type { TrafficChannelId } from "@/lib/analytics/traffic-channel-rules";
export function TrafficChannelIcon({ channel }: { channel: TrafficChannelId }) {
  const className = "size-4 text-muted-foreground";
  switch (channel) {
    case "organic_search":
      return <SearchIcon className={className} />;
    case "social":
      return <ShareIcon className={className} />;
    case "paid_search":
      return <CircleDollarSignIcon className={className} />;
    case "paid_social":
      return <MegaphoneIcon className={className} />;
    case "display":
      return <BadgeDollarSignIcon className={className} />;
    case "email":
      return <MailIcon className={className} />;
    case "affiliate":
    case "referral":
      return <LinkIcon className={className} />;
    case "campaign":
      return <TagIcon className={className} />;
    case "direct":
      return <MousePointerIcon className={className} />;
    case "other":
      return <CircleHelpIcon className={className} />;
  }
}
