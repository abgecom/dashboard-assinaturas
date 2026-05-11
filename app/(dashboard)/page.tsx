import Link from 'next/link';
import { Users, Repeat, DollarSign, TrendingDown, CheckCircle2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import {
  getMonthlyRevenue,
  getOverviewMetrics,
  getTopCustomersByLTV,
} from '@/lib/metrics/overview';
import { formatBRL, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export default async function OverviewPage() {
  const [metrics, monthly, topCustomers] = await Promise.all([
    getOverviewMetrics(),
    getMonthlyRevenue(12),
    getTopCustomersByLTV(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das assinaturas, receita e saúde da base nos últimos 30 dias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita 30d"
          value={formatBRL(metrics.revenue30)}
          delta={metrics.revenueDelta}
          hint="vs. 30 dias anteriores"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Assinaturas ativas"
          value={metrics.activeSubscriptions.toLocaleString('pt-BR')}
          hint={`${metrics.canceledSubscriptions.toLocaleString('pt-BR')} canceladas`}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KpiCard
          title="Churn 30d"
          value={formatPercent(metrics.churnRate30)}
          hint="canceladas / ativas no início"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          title="Taxa de pagamento"
          value={formatPercent(metrics.paymentSuccessRate)}
          hint={`${metrics.paidCharges30} pagas / ${metrics.failedCharges30} falhas`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Total de clientes"
          value={metrics.totalCustomers.toLocaleString('pt-BR')}
          hint={`+${metrics.newCustomers30.toLocaleString('pt-BR')} nos últimos 30d`}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          title="ARPU (30d)"
          value={formatBRL(metrics.arpu)}
          hint="receita / assinaturas ativas"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Ticket médio"
          value={formatBRL(metrics.avgTicket30)}
          hint="por cobrança paga (30d)"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title="Cobranças pagas 30d"
          value={metrics.paidCharges30.toLocaleString('pt-BR')}
          hint={`${metrics.failedCharges30.toLocaleString('pt-BR')} falharam`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Receita mensal — últimos 12 meses
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
