import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      api.setTokens({ accessToken, refreshToken });
      api.getProfile().then((user) => {
        setAuth(user, { accessToken, refreshToken });
        navigate('/');
      });
    } else {
      navigate('/login');
    }
  }, [params, navigate, setAuth]);

  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner />
    </div>
  );
}
