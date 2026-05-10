import { useState } from 'react';
import { EmployeeListPage } from '@/pages/EmployeeListPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProductListPage } from '@/pages/ProductListPage';
import type { LoginSession } from '@/services/authService';

type AppView = 'products' | 'employees';

export function App() {
  const [session, setSession] = useState<LoginSession | null>(null);
  const [activeView, setActiveView] = useState<AppView>('products');

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  if (activeView === 'employees') {
    return (
      <>
        <nav className="app-nav" aria-label="Primary">
          <button onClick={() => setActiveView('products')} type="button">
            Products
          </button>
          <button aria-current="page" onClick={() => setActiveView('employees')} type="button">
            Employees
          </button>
        </nav>
        <EmployeeListPage
          accessToken={session.accessToken}
          userBranchId={session.user.branchId}
          userName={session.user.name}
        />
      </>
    );
  }

  return (
    <>
      <nav className="app-nav" aria-label="Primary">
        <button aria-current="page" onClick={() => setActiveView('products')} type="button">
          Products
        </button>
        <button onClick={() => setActiveView('employees')} type="button">
          Employees
        </button>
      </nav>
      <ProductListPage accessToken={session.accessToken} userName={session.user.name} />
    </>
  );
}
