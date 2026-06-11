import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@lifehub/ui';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export function LoginPage() {
  const { t } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, tokens } = await api.login({ email, password });
      setAuth(user, tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginDescription')}</CardDescription>
        </div>
        <LanguageSwitcher compact />
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('common.password')}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.loginLoading') : t('auth.loginButton')}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild>
            <a href="/api/auth/google">{t('auth.loginGoogle')}</a>
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary hover:underline">
              {t('auth.registerLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
