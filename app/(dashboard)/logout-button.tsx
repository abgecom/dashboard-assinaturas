'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
