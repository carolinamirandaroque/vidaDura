import { Download, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@lifehub/ui';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function PwaInstallCard() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, showIosHint, install } = usePwaInstall();

  if (isInstalled) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            {t('pwa.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('pwa.installed')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!canInstall && !showIosHint) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4" />
          {t('pwa.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {showIosHint ? t('pwa.iosHint') : t('pwa.description')}
        </p>
        {canInstall && (
          <Button onClick={() => install()} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {t('pwa.install')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
