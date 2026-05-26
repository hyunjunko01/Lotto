// src/app/layout.tsx
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { AppHeader } from '@/components/shared/AppHeader';

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
