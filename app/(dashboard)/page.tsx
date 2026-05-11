import Link from 'next/link';
import {
  Users,
  Repeat,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Receipt,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { DateRangePicker } from '@/components/date-range-picker';
import { RevenueChart } from '@/components/charts/revenue-chart';
import {
  getMonthlyRevenue,
  getOverviewMetrics,
  getTopCustomersByLTV,
} from '@/lib/metrics/overview';
import { getPlanBreakdown, getForecast } from '@/lib/metrics/breakdown';
import { formatRangeLabel, parseRangeFromParams, toISODate } from '@/lib/metrics/range';
import { formatBRL, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const range = parseRangeFromParams(searchParams ?? {});
  const fromStr = searchParams?.from ?? toISODate(range.from);
  const toStr = searchParams?.to ?? toISODate(range.to);
  const rangeLabel = formatRangeLabel(range);

  const [metrics, monthly, topCustomers, breakdown, forecast] = await Promise.all([
    getOverviewMetrics(range),
    getMonthlyRevenue(12),
    getTopCustomersByLTV(10),
    getPlanBreakdown(range),
    getForecast(range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <DateRangePicker from={fromStr} to={toStr} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita de assinaturas"
          value={formatBRL(metrics.revenueInRange)}
          delta={metrics.revenueDelta}
          hint="vs. período anterior"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Assinaturas ativas"
          value={metrics.activeSubscriptions.toLocaleString('pt-BR')}
          hint={`${metrics.canceledSubscriptionsTotal.toLocaleString('pt-BR')} canceladas no total`}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KpiCard
          title="Churn no período"
          value={formatPercent(metrics.churnRateInRange)}
          hint={`${metrics.canceledInRange.toLocaleString('pt-BR')} cancelaram`}
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
          title="ARPU"
          value={formatBRL(metrics.arpu)}
          hint="receita / assinaturas ativas"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Ticket médio"
          value={formatBRL(metrics.avgTicketInRange)}
          hint="por cobrança paga"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title="A receber no período"
          value={formatBRL(forecast.totalAmount)}
          hint={`${forecast.totalCount.toLocaleString('pt-BR')} assinaturas previstas`}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Previsibilidade — a receber no período
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Subs ativas com <code className="rounded bg-muted px-1">next_billing_at</code> no
              período × valor estimado. Subs em trial (1ª cobrança) usam o preço do plano. Cobranças
              passadas no período estão em "Receita e faturas por plano" abaixo.
            </p>
          </CardHeader>
          <CardContent>
            {forecast.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma assinatura com cobrança prevista no período. Tenta "Próx. 30d".
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Plano</th>
                      <th className="py-2 pr-3 text-right">Assinaturas</th>
                      <th className="py-2 pr-3 text-right">A receber (est.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.rows.map((r) => (
                      <tr key={r.plan} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">
                          {r.plan}
                          {r.unknown_value_count > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({r.unknown_value_count} sem preço)
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.subscription_count}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-semibold text-amber-700">
                          {formatBRL(r.estimated_amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40">
                      <td className="py-2 pr-3 font-semibold">
                        Total
                        {forecast.unknownValueCount > 0 && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({forecast.unknownValueCount} sem preço)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                        {forecast.totalCount}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold text-amber-700">
                        {formatBRL(forecast.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <XCircle className="h-4 w-4 text-red-600" />
              Cancelamentos por plano no período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.every((b) => b.canceled_subscriptions === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum cancelamento no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Plano</th>
                      <th className="py-2 pr-3 text-right">Cancelados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown
                      .filter((b) => b.canceled_subscriptions > 0)
                      .map((b) => (
                        <tr key={b.plan} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{b.plan}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-red-700">
                            {b.canceled_subscriptions}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Receita e faturas por plano no período
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem faturas no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3 text-right">Faturas</th>
                    <th className="py-2 pr-3 text-right">Pagas</th>
                    <th className="py-2 pr-3 text-right">Pendentes</th>
                    <th className="py-2 pr-3 text-right">Falhas</th>
                    <th className="py-2 pr-3 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr key={b.plan} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{b.plan}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{b.invoice_count}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-emerald-700">
                        {b.paid_count} · {formatBRL(b.paid_amount)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-amber-700">
                        {b.pending_count} · {formatBRL(b.pending_amount)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-red-700">
                        {b.failed_count} · {formatBRL(b.failed_amount)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                        {formatBRL(b.paid_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
