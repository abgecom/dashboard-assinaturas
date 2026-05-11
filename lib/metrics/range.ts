const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = { from: Date; to: Date };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Forçamos timezone BRT (UTC-3) porque o servidor da Vercel roda em UTC,
// mas a Pagar.me grava horários em horário brasileiro. Brasil não tem
// horário de verão desde 2019, então UTC-3 é fixo.
const BRT_OFFSET = '-03:00';

export function startOfDay(s: string): Date {
  return new Date(`${s}T00:00:00.000${BRT_OFFSET}`);
}

export function endOfDay(s: string): Date {
  return new Date(`${s}T23:59:59.999${BRT_OFFSET}`);
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
