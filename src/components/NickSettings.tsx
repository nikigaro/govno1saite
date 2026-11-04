import { useEffect, useState } from 'react';
import ProfilePanel from '@/components/ProfilePanel';
import AuthForm from '@/components/AuthForm';
import { fetchCurrentAccount } from '@/api/account';
import type { AuthorProfile } from '@/types';

export default function NickSettings() {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCurrentAccount()
      .then((account) => {
        if (active) setProfile(account);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить аккаунт');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 text-stone-900 shadow-sm sm:p-6 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
      {loading ? (
        <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">Загружаем...</p>
      ) : loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </p>
      ) : profile ? (
        <ProfilePanel profile={profile} onChange={setProfile} />
      ) : (
        <AuthForm onAuthenticated={setProfile} />
      )}
    </div>
  );
}
