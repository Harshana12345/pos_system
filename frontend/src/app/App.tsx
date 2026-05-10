import { useState } from 'react';
import { BrandListPage } from '@/pages/BrandListPage';
import { CategoryListPage } from '@/pages/CategoryListPage';
import { EmployeeListPage } from '@/pages/EmployeeListPage';
import { InventoryListPage } from '@/pages/InventoryListPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProductListPage } from '@/pages/ProductListPage';
import { StockTransferPage } from '@/pages/StockTransferPage';
import type { LoginSession } from '@/services/authService';

type AppView = 'products' | 'inventory' | 'transfers' | 'categories' | 'brands' | 'employees';

const NAV_ITEMS: { label: string; value: AppView }[] = [
  { label: 'Products', value: 'products' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Transfers', value: 'transfers' },
  { label: 'Categories', value: 'categories' },
  { label: 'Brands', value: 'brands' },
  { label: 'Employees', value: 'employees' },
];

export function App() {
  const [session, setSession] = useState<LoginSession | null>(null);
  const [activeView, setActiveView] = useState<AppView>('products');

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  const nav = (
    <nav className="app-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <button
          aria-current={activeView === item.value ? 'page' : undefined}
          key={item.value}
          onClick={() => setActiveView(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );

  if (activeView === 'employees') {
    return (
      <>
        {nav}
        <EmployeeListPage
          accessToken={session.accessToken}
          userBranchId={session.user.branchId}
          userName={session.user.name}
        />
      </>
    );
  }

  if (activeView === 'categories') {
    return (
      <>
        {nav}
        <CategoryListPage accessToken={session.accessToken} userName={session.user.name} />
      </>
    );
  }

  if (activeView === 'brands') {
    return (
      <>
        {nav}
        <BrandListPage accessToken={session.accessToken} userName={session.user.name} />
      </>
    );
  }

  if (activeView === 'inventory') {
    return (
      <>
        {nav}
        <InventoryListPage accessToken={session.accessToken} userName={session.user.name} />
      </>
    );
  }

  if (activeView === 'transfers') {
    return (
      <>
        {nav}
        <StockTransferPage accessToken={session.accessToken} userName={session.user.name} />
      </>
    );
  }

  return (
    <>
      {nav}
      <ProductListPage accessToken={session.accessToken} userName={session.user.name} />
    </>
  );
}
