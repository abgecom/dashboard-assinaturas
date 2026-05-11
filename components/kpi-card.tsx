import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

type Props = {
  title: string;
  value: string;
  hint?: string;
  delta?: number | null;
  icon?: React.ReactNode;
};

export function KpiCard({ title, value, hint, delta, icon }: Props) {
  const showDelta = typeof delta === 'number' && Number.isFinite(delta);
  const positive = showDelta && delta! >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {showDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                positive ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {(Math.abs(delta!) * 100).toFixed(1)}%
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
