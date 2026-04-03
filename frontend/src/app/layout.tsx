// src/app/layout.tsx
import './globals.css';
import { Providers } from '@/components/Providers';
import { AppHeader } from '@/components/AppHeader';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
