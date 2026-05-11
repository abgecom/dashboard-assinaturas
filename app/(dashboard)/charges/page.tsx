import { listCharges } from '@/lib/queries/charges';
import { ChargesTable } from './charges-table';

export const dynamic = 'force-dynamic';

export default async function ChargesPage() {
  const charges = await listCharges(1000);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cobranças</h1>
        <p className="text-sm text-muted-foreground">
          {charges.length.toLocaleString('pt-BR')} cobranças carregadas (mais recentes primeiro).
        </p>
      </div>
      <ChargesTable data={charges} />
    </div>
  );
}
