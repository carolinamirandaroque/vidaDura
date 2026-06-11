import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@lifehub/ui';
import { PaddleBoardIcon } from '@/components/shared/PaddleBoardIcon';

export function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/calendar', icon: Calendar, label: t('nav.calendar') },
    { to: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { to: '/shopping', icon: ShoppingCart, label: t('nav.shopping') },
    { to: '/expenses', icon: Wallet, label: t('nav.expenses') },
    { to: '/contacts', icon: Users, label: t('nav.contacts') },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <PaddleBoardIcon className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">{t('common.appName')}</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
