import Link from 'next/link';
import { LayoutDashboard, Users, CreditCard, Receipt, Repeat, RefreshCcw } from 'lucide-react';
import { LogoutButton } from './logout-button';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/subscriptions', label: 'Assinaturas', icon: Repeat },
  { href: '/invoices', label: 'Faturas', icon: Receipt },
  { href: '/charges', label: 'Cobranças', icon: CreditCard },
  { href: '/sync', label: 'Sincronização', icon: RefreshCcw },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 items-center border-b px-4 font-semibold">Petloo</div>
        <nav className="flex-1 p-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-2">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex h-14 items-center border-b px-6 text-sm text-muted-foreground">
          Dashboard de Assinaturas
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
