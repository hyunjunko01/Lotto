// src/app/layout.tsx
import './globals.css';
import { AppHeader } from '@/components/shared/AppHeader';
import shellStyles from '@/components/shared/AppShell.module.css';
import { Providers } from '@/components/shared/Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className={shellStyles.shell}>
            <AppHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
