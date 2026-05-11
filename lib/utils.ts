import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd/MM/yyyy"): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, pattern, { locale: ptBR });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "dd/MM/yyyy 'às' HH:mm");
}
