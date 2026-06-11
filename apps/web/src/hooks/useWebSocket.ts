import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/websocket';
import { useAuthStore } from '@/stores/auth.store';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribers = [
      wsClient.on('notification', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
      wsClient.on('event_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
      wsClient.on('task_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
      wsClient.on('expense_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
      wsClient.on('connection_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [isAuthenticated, queryClient]);
}
