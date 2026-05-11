const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = { from: Date; to: Date };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(s: string): Date {
  const [yStr, mStr, dStr] = s.split('-');
  const y = Number(yStr ?? 1970);
  const m = Number(mStr ?? 1);
  const d = Number(dStr ?? 1);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfDay(s: string): Date {
  const [yStr, mStr, dStr] = s.split('-');
  const y = Number(yStr ?? 1970);
  const m = Number(mStr ?? 1);
  const d = Number(dStr ?? 1);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * DAY_MS);
  return { from, to };
}

export function parseRangeFromParams(params: { from?: string; to?: string }): DateRange {
  const def = defaultRange();
  const from = params.from ? startOfDay(params.from) : def.from;
  const to = params.to ? endOfDay(params.to) : def.to;
  return { from, to };
}

export function previousRange({ from, to }: DateRange): DateRange {
  const span = to.getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - span - 1),
    to: new Date(from.getTime() - 1),
  };
}

export function formatRangeLabel({ from, to }: DateRange): string {
  const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${from.toLocaleDateString('pt-BR', opt)} → ${to.toLocaleDateString('pt-BR', opt)}`;
}
