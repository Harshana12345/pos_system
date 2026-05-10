import { useState } from 'react';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import type { LoginSession } from '@/services/authService';

export function App() {
  const [session, setSession] = useState<LoginSession | null>(null);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  return <DashboardPage userName={session.user.name} />;
}
