import { listInvoices } from '@/lib/queries/invoices';
import { InvoicesTable } from './invoices-table';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await listInvoices(1000);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Faturas</h1>
        <p className="text-sm text-muted-foreground">
          {invoices.length.toLocaleString('pt-BR')} faturas carregadas (mais recentes primeiro).
        </p>
      </div>
      <InvoicesTable data={invoices} />
    </div>
  );
}
