interface DimensionValueRow {
  readonly value: string;
  readonly views: number;
  readonly sessions: number;
  readonly visitors: number;
}

interface PageValueRow {
  readonly pathname: string;
  readonly views: number;
  readonly sessions: number;
}

interface ReferrerValueRow {
  readonly referrer: string;
  readonly views: number;
  readonly sessions: number;
}

export function mapPages(rows: readonly PageValueRow[]) {
  return rows.map((row) => ({
    pathname: row.pathname,
    views: row.views,
    sessions: row.sessions,
  }));
}

export function mapTabs(rows: readonly DimensionValueRow[] | null | undefined) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    label: row.value,
    views: row.views,
    sessions: row.sessions,
    visitors: row.visitors,
  }));
}

export function mapReferrers(rows: readonly ReferrerValueRow[]) {
  return rows.map((row) => ({
    referrer: row.referrer,
    views: row.views,
    sessions: row.sessions,
  }));
}
