import { useState } from 'react';
import { EmployeeListPage } from '@/pages/EmployeeListPage';
import { LoginPage } from '@/pages/LoginPage';
import type { LoginSession } from '@/services/authService';

export function App() {
  const [session, setSession] = useState<LoginSession | null>(null);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  return <EmployeeListPage accessToken={session.accessToken} userName={session.user.name} />;
}
