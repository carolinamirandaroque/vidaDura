import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Calendar, CheckSquare, Wallet, Users } from 'lucide-react';
import { cn } from '@lifehub/ui';

export function MobileNav() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.home') },
    { to: '/calendar', icon: Calendar, label: t('nav.calendar') },
    { to: '/tasks', icon: CheckSquare, label: t('nav.tasks') },
    { to: '/expenses', icon: Wallet, label: t('nav.expenses') },
    { to: '/contacts', icon: Users, label: t('nav.contacts') },
  ];

  return (
    <nav className="flex items-center justify-around border-t bg-card px-2 py-2 md:hidden">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
