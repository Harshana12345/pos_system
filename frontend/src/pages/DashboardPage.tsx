import { MainLayout } from '@/layouts/MainLayout';

export function DashboardPage() {
  return (
    <MainLayout>
      <section className="page-header">
        <p className="eyebrow">POS System</p>
        <h1>Sales Dashboard</h1>
        <p className="summary">Frontend workspace ready for products, orders, customers, and reports.</p>
      </section>
    </MainLayout>
  );
}
