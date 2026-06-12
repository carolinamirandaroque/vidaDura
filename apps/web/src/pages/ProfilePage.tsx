import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LogOut, User } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
} from '@lifehub/ui';
import { HubPanel, hubSectionClass } from '@/components/hub';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { getInitials } from '@lifehub/utils';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { PwaInstallCard } from '@/components/shared/PwaInstallCard';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Lisbon');

  const updateMutation = useMutation({
    mutationFn: () => api.updateProfile({ name, timezone }),
    onSuccess: (updated) => updateUser(updated),
  });

  return (
    <PageShell width="narrow" className="pb-6">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className={hubSectionClass}>
        <HubPanel title={t('profile.title')} icon={User}>
          <div className="mb-4 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar ?? undefined} />
              <AvatarFallback className="text-lg">
                {user ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.timezone')}</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {t('common.save')}
            </Button>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>{t('language.label')}</Label>
              <LanguageSwitcher />
            </div>
          </div>
        </HubPanel>

        <PwaInstallCard />

        <Button variant="destructive" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> {t('profile.logout')}
        </Button>
      </div>
    </PageShell>
  );
}
