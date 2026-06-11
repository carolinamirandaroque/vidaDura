import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TasksPage } from '@/pages/TasksPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { ShoppingListPage } from '@/pages/ShoppingListPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="shopping" element={<ShoppingListPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
