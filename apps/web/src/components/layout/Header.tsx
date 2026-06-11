import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, Moon, Sun, User } from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@lifehub/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { api } from '@/lib/api';
import { getInitials } from '@lifehub/utils';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { PaddleBoardIcon } from '@/components/shared/PaddleBoardIcon';

export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.getNotifications(true).then((n) => n.length),
    refetchInterval: 60_000,
  });

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <PaddleBoardIcon className="h-5 w-5 text-primary" />
        <span className="text-lg font-bold">{t('common.appName')}</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <LanguageSwitcher compact />
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
        <Link to="/notifications" className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link to="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar ?? undefined} />
              <AvatarFallback>{user ? getInitials(user.name) : <User className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
          </Button>
        </Link>
      </div>
    </header>
  );
}
