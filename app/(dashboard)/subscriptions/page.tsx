import { listSubscriptions } from '@/lib/queries/subscriptions';
import { SubscriptionsTable } from './subscriptions-table';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const subs = await listSubscriptions(1000);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">
          {subs.length.toLocaleString('pt-BR')} assinaturas carregadas (mais recentes primeiro).
        </p>
      </div>
      <SubscriptionsTable data={subs} />
    </div>
  );
}
