import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { LogOut, Pencil, UserRound } from 'lucide-react';
import { logoutAccount, updateAccountProfile } from '@/api/account';
import { getAvatarUrl, uploadAvatar } from '@/api/avatar';
import AuthorName from '@/components/AuthorName';
import NickColorPicker from '@/components/NickColorPicker';
import { type AuthorColor } from '@/lib/authorColors';
import { AVATAR_MAX_BYTES } from '@/lib/avatarImage';
import { inputClass } from '@/lib/formStyles';
import type { AuthorProfile } from '@/types';
const MAX_NICK = 20;

interface ProfilePanelProps {
  profile: AuthorProfile;
  onChange: (profile: AuthorProfile | null) => void;
}

export default function ProfilePanel({ profile, onChange }: ProfilePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(profile.nick);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleColorChange = (color: AuthorColor) =>
    run(async () => {
      const updated = await updateAccountProfile({ nick: profile.nick, color });
      onChange({ ...profile, ...updated });
    }, 'Не удалось сменить цвет');

  const handleNickSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nick = nickDraft.trim();
    if (!nick) {
      setError('Введите ник');
      return;
    }
    void run(async () => {
      const updated = await updateAccountProfile({ nick, color: profile.color as AuthorColor });
      onChange({ ...profile, ...updated });
      setEditingNick(false);
    }, 'Не удалось сохранить ник');
  };

  const handleAvatarPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setError('Фото больше 5 МБ, выберите файл поменьше');
      return;
    }
    void run(async () => {
      const path = await uploadAvatar(file);
      onChange({ ...profile, avatar_path: path });
      setAvatarVersion(Date.now());
    }, 'Не удалось загрузить аватар');
  };

  const handleLogout = () =>
    run(async () => {
      await logoutAccount();
      onChange(null);
    }, 'Не удалось выйти');

  const startNickEdit = () => {
    setNickDraft(profile.nick);
    setError(null);
    setEditingNick(true);
  };

  const cancelNickEdit = () => {
    setEditingNick(false);
    setError(null);
  };

  const avatarSrc = profile.avatar_path
    ? `${getAvatarUrl(profile.avatar_path)}${avatarVersion ? `?v=${avatarVersion}` : ''}`
    : null;

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 bg-emerald-50 px-4 py-3 dark:border-stone-800 dark:bg-emerald-950/40">
        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="text-xs font-bold tracking-wider text-emerald-800 dark:text-emerald-300">ПРОФИЛЬ</h2>
        </div>
        <NickColorPicker compact value={profile.color as AuthorColor} onChange={handleColorChange} />
      </header>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Сменить аватар"
            className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 transition-colors hover:border-emerald-400 disabled:cursor-not-allowed dark:border-stone-700 dark:bg-stone-800"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-bold text-stone-400">
                {profile.nick.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          <div className="min-w-0 space-y-1">
            <AuthorName
              name={profile.nick}
              color={profile.color}
              role={profile.role}
              verified={profile.is_verified}
            />
            {!editingNick && (
              <button
                type="button"
                onClick={startNickEdit}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 transition-colors hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-400"
              >
                <Pencil size={12} aria-hidden="true" />
                Изменить ник
              </button>
            )}
          </div>
        </div>

        {editingNick && (
          <form onSubmit={handleNickSave} className="space-y-2">
            <input
              value={nickDraft}
              onChange={(event) => setNickDraft(event.target.value)}
              maxLength={MAX_NICK}
              aria-label="Новый ник"
              className={inputClass}
            />
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="submit"
                disabled={busy}
                className="text-emerald-700 transition-colors hover:text-emerald-800 disabled:opacity-60 dark:text-emerald-400"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={cancelNickEdit}
                className="text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="text-xs font-medium text-stone-500 transition-colors hover:text-emerald-700 disabled:opacity-60 dark:text-stone-400 dark:hover:text-emerald-400"
        >
          Загрузить фото (квадрат, до 5 МБ)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarPick}
          aria-label="Файл аватара"
          className="hidden"
        />

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <LogOut size={14} aria-hidden="true" />
          Выйти
        </button>
      </div>
    </section>
  );
}
