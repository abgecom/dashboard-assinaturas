import { listCustomersWithHealth } from '@/lib/queries/customers';
import { CustomersTable } from './customers-table';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await listCustomersWithHealth(500);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length.toLocaleString('pt-BR')} clientes carregados (mais recentes primeiro).
        </p>
      </div>
      <CustomersTable data={customers} />
    </div>
  );
}
