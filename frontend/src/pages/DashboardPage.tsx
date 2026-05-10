import { MainLayout } from '@/layouts/MainLayout';

type DashboardPageProps = {
  userName?: string;
};

export function DashboardPage({ userName }: DashboardPageProps) {
  return (
    <MainLayout>
      <section className="page-header">
        <p className="eyebrow">POS System</p>
        <h1>Sales Dashboard</h1>
        <p className="summary">
          {userName
            ? `Welcome back, ${userName}. Products, orders, customers, and reports are ready.`
            : 'Frontend workspace ready for products, orders, customers, and reports.'}
        </p>
      </section>
    </MainLayout>
  );
}
