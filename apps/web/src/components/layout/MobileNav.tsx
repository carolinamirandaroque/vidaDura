import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import { NAV_ITEMS } from './nav-items';

export function MobileNav() {
  const { t } = useTranslation();

  return (
    <nav className="grid grid-cols-6 border-t bg-card/95 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      {NAV_ITEMS.map(({ to, icon: Icon, labelKey, mobileLabelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[9px] font-medium leading-none transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <Icon className="h-5 w-5" />
          <span className="max-w-full truncate">{t(mobileLabelKey ?? labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
