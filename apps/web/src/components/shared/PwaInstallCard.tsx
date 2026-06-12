import { Download, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lifehub/ui';
import { HubHint, HubPanel } from '@/components/hub';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallCard() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, manualHint, install } = usePwaInstall();

  if (isInstalled) {
    return (
      <HubPanel title={t('pwa.title')} icon={Smartphone}>
        <HubHint>{t('pwa.installed')}</HubHint>
      </HubPanel>
    );
  }

  if (!canInstall && !manualHint) return null;

  const hintText =
    manualHint === 'ios'
      ? t('pwa.iosHint')
      : manualHint === 'android'
        ? t('pwa.androidHint')
        : t('pwa.description');

  return (
    <HubPanel title={t('pwa.title')} icon={Smartphone}>
      <div className="space-y-3">
        <HubHint>{hintText}</HubHint>
        {canInstall && (
          <Button onClick={() => install()} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {t('pwa.install')}
          </Button>
        )}
      </div>
    </HubPanel>
  );
}
