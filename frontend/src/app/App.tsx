import { useState } from 'react';
import { BrandListPage } from '@/pages/BrandListPage';
import { CategoryListPage } from '@/pages/CategoryListPage';
import { CustomerListPage } from '@/pages/CustomerListPage';
import { EmployeeListPage } from '@/pages/EmployeeListPage';
import { InventoryListPage } from '@/pages/InventoryListPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProductListPage } from '@/pages/ProductListPage';
import { PurchaseOrderPage } from '@/pages/PurchaseOrderPage';
import { StockTransferPage } from '@/pages/StockTransferPage';
import { SupplierDetailPage } from '@/pages/SupplierDetailPage';
import { SupplierListPage } from '@/pages/SupplierListPage';
import type { LoginSession } from '@/services/authService';
import type { Supplier } from '@/services/supplierService';

type AppView =
  | 'products'
  | 'inventory'
  | 'transfers'
  | 'purchases'
  | 'categories'
  | 'brands'
  | 'suppliers'
  | 'customers'
  | 'employees';

const NAV_ITEMS: { label: string; value: AppView }[] = [
  { label: 'Products', value: 'products' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Transfers', value: 'transfers' },
  { label: 'Purchases', value: 'purchases' },
  { label: 'Categories', value: 'categories' },
  { label: 'Brands', value: 'brands' },
  { label: 'Suppliers', value: 'suppliers' },
  { label: 'Customers', value: 'customers' },
  { label: 'Employees', value: 'employees' },
];

export function App() {
  const [session, setSession] = useState<LoginSession | null>(null);
  const [activeView, setActiveView] = useState<AppView>('products');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  const nav = (
    <nav className="app-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <button
          aria-current={activeView === item.value ? 'page' : undefined}
          key={item.value}
          onClick={() => {
            setActiveView(item.value);
            setSelectedSupplier(null);
          }}
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

  if (activeView === 'suppliers' && selectedSupplier) {
    return (
      <>
        {nav}
        <SupplierDetailPage
          accessToken={session.accessToken}
          onBack={() => setSelectedSupplier(null)}
          onSupplierChange={setSelectedSupplier}
          supplier={selectedSupplier}
        />
      </>
    );
  }

  if (activeView === 'suppliers') {
    return (
      <>
        {nav}
        <SupplierListPage
          accessToken={session.accessToken}
          onOpenSupplier={setSelectedSupplier}
          userName={session.user.name}
        />
      </>
    );
  }

  if (activeView === 'customers') {
    return (
      <>
        {nav}
        <CustomerListPage accessToken={session.accessToken} userName={session.user.name} />
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

  if (activeView === 'purchases') {
    return (
      <>
        {nav}
        <PurchaseOrderPage
          accessToken={session.accessToken}
          userBranchId={session.user.branchId}
          userName={session.user.name}
        />
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
