import type { PropsWithChildren } from 'react';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <main className="app-shell">
      <div className="content">{children}</div>
    </main>
  );
}
