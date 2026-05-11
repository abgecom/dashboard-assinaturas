import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { getCustomerDetail } from '@/lib/queries/customers';
import { formatBRL, formatDate, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const detail = await getCustomerDetail(params.id);
  if (!detail.customer) notFound();

  const customer = detail.customer as Record<string, any>;
  const health = detail.health;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{customer.name ?? '—'}</h1>
        <p className="text-sm text-muted-foreground">{customer.email ?? '—'}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle>LTV</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBRL(health?.lifetime_value ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>Assinaturas ativas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{health?.active_subscriptions ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {health?.canceled_subscriptions ?? 0} canceladas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>Cobranças pagas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{health?.paid_charges_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {health?.failed_charges_count ?? 0} falhas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>Próxima cobrança</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatDate(health?.next_billing_at)}</p>
            <p className="text-xs text-muted-foreground">
              Último pgto: {formatDate(health?.last_payment_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <Field label="Documento" value={`${customer.document_type?.toUpperCase() ?? ''} ${customer.document ?? '—'}`} />
            <Field label="Tipo" value={customer.type ?? '—'} />
            <Field label="Telefone" value={customer.phone ?? '—'} />
            <Field label="Cliente desde" value={formatDate(customer.pagarme_created_at)} />
            <Field label="ID Pagar.me" value={customer.pagarme_id} mono />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Assinaturas ({detail.subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma assinatura.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Pagamento</th>
                    <th className="py-2 pr-3">Início</th>
                    <th className="py-2 pr-3">Próxima cobrança</th>
                    <th className="py-2 pr-3">Cancelada em</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.subscriptions.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{s.petloo_plans?.name ?? '—'}</td>
                      <td className="py-2 pr-3"><StatusBadge status={s.status} /></td>
                      <td className="py-2 pr-3">{s.payment_method ?? '—'}</td>
                      <td className="py-2 pr-3">{formatDate(s.start_at)}</td>
                      <td className="py-2 pr-3">{formatDate(s.next_billing_at)}</td>
                      <td className="py-2 pr-3">{formatDate(s.canceled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Faturas recentes ({detail.invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma fatura.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Pagamento</th>
                    <th className="py-2 pr-3">Cobrada em</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.invoices.map((i: any) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{i.code ?? '—'}</td>
                      <td className="py-2 pr-3"><StatusBadge status={i.status} /></td>
                      <td className="py-2 pr-3">{formatBRL(i.amount)}</td>
                      <td className="py-2 pr-3">{i.payment_method ?? '—'}</td>
                      <td className="py-2 pr-3">{formatDate(i.billing_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Cobranças recentes ({detail.charges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.charges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cobrança.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Pago</th>
                    <th className="py-2 pr-3">Método</th>
                    <th className="py-2 pr-3">Vencimento</th>
                    <th className="py-2 pr-3">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.charges.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{c.code ?? '—'}</td>
                      <td className="py-2 pr-3"><StatusBadge status={c.status} /></td>
                      <td className="py-2 pr-3">{formatBRL(c.amount)}</td>
                      <td className="py-2 pr-3">{formatBRL(c.paid_amount)}</td>
                      <td className="py-2 pr-3">{c.payment_method ?? '—'}</td>
                      <td className="py-2 pr-3">{formatDate(c.due_at)}</td>
                      <td className="py-2 pr-3">{formatDateTime(c.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : ''}>{value}</dd>
    </div>
  );
}
