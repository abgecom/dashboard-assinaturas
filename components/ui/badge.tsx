import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'muted';

const variants: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  muted: 'bg-muted text-muted-foreground',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const STATUS_LABELS: Record<string, { label: string; variant: Variant }> = {
  active: { label: 'Ativa', variant: 'success' },
  canceled: { label: 'Cancelada', variant: 'destructive' },
  future: { label: 'Futura', variant: 'muted' },
  paid: { label: 'Paga', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  failed: { label: 'Falhou', variant: 'destructive' },
  processing: { label: 'Processando', variant: 'warning' },
  overdue: { label: 'Atrasada', variant: 'destructive' },
  canceled_invoice: { label: 'Cancelada', variant: 'muted' },
  refunded: { label: 'Reembolsada', variant: 'muted' },
  chargedback: { label: 'Chargeback', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="muted">—</Badge>;
  const config = STATUS_LABELS[status] ?? { label: status, variant: 'muted' as Variant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
