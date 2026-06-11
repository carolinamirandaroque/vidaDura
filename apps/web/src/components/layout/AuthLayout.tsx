import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PaddleBoardIcon } from '@/components/shared/PaddleBoardIcon';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <PaddleBoardIcon className="h-8 w-8" />
          <span className="text-2xl font-bold">{t('common.appName')}</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            {t('auth.tagline1')}
            <br />
            {t('auth.tagline2')}
          </h1>
          <p className="mt-4 text-lg opacity-80">{t('auth.subtitle')}</p>
        </div>
        <p className="text-sm opacity-60">© 2026 {t('common.appName')}</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
