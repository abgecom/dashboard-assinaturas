import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CustomerNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Cliente não encontrado</h2>
        <p className="text-sm text-muted-foreground">
          O cliente que você tentou abrir não existe ou foi removido.
        </p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
      </div>
    </div>
  );
}
