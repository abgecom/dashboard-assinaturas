import Link from 'next/link';
import { Users, Repeat, DollarSign, TrendingDown, CheckCircle2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { RangeSelector } from '@/components/range-selector';
import { RevenueChart } from '@/components/charts/revenue-chart';
import {
  RANGE_LABELS,
  getMonthlyRevenue,
  getOverviewMetrics,
  getTopCustomersByLTV,
  parseRange,
} from '@/lib/metrics/overview';
import { formatBRL, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: { range?: string };
}) {
  const range = parseRange(searchParams?.range);
  const rangeLabel = RANGE_LABELS[range].toLowerCase();

  const [metrics, monthly, topCustomers] = await Promise.all([
    getOverviewMetrics(range),
    getMonthlyRevenue(12),
    getTopCustomersByLTV(10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral das assinaturas, receita recorrente e saúde da base ({rangeLabel}).
          </p>
        </div>
        <RangeSelector current={range} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={`Receita de assinaturas (${rangeLabel})`}
          value={formatBRL(metrics.revenueInRange)}
          delta={metrics.revenueDelta}
          hint={range === 'all' ? 'todo o período' : 'vs. período anterior'}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Assinaturas ativas"
          value={metrics.activeSubscriptions.toLocaleString('pt-BR')}
          hint={`${metrics.canceledSubscriptions.toLocaleString('pt-BR')} canceladas no total`}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KpiCard
          title={`Churn (${rangeLabel})`}
          value={formatPercent(metrics.churnRateInRange)}
          hint="canceladas / ativas no início"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          title="Taxa de pagamento"
          value={formatPercent(metrics.paymentSuccessRate)}
          hint={`${metrics.paidChargesInRange} pagas / ${metrics.failedChargesInRange} falhas`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Total de clientes"
          value={metrics.totalCustomers.toLocaleString('pt-BR')}
          hint={`+${metrics.newCustomersInRange.toLocaleString('pt-BR')} no período`}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          title={`ARPU (${rangeLabel})`}
          value={formatBRL(metrics.arpu)}
          hint="receita / assinaturas ativas"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Ticket médio"
          value={formatBRL(metrics.avgTicketInRange)}
          hint="por cobrança paga no período"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title={`Cobranças pagas (${rangeLabel})`}
          value={metrics.paidChargesInRange.toLocaleString('pt-BR')}
          hint={`${metrics.failedChargesInRange.toLocaleString('pt-BR')} falharam`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Receita mensal de assinaturas — últimos 12 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Top 10 clientes por LTV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda. Rode o sync.</p>
            ) : (
              topCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name ?? '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatBRL(c.lifetime_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.last_payment_at ? formatDate(c.last_payment_at) : '—'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
