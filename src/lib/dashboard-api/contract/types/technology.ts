export interface BrowserTrendSeries {
  key: string;
  label: string;
  views: number;
  visitors: number;
  sessions: number;
  isOther?: boolean;
}

export interface BrowserTrendPoint {
  bucket: number;
  timestampMs: number;
  totalVisitors: number;
  visitorsBySeries: Record<string, number>;
}

export interface BrowserTrendData {
  ok: boolean;
  interval: "minute" | "hour" | "day" | "week" | "month";
  series: BrowserTrendSeries[];
  data: BrowserTrendPoint[];
}
