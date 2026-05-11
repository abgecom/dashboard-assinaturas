import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Petloo Dashboard',
  description: 'Gestão interna de assinaturas Pagar.me',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
