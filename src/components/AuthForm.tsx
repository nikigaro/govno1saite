import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import AuthorName from '@/components/AuthorName';
import NickColorPicker from '@/components/NickColorPicker';
import { loginAccount, registerAccount } from '@/api/account';
import { type AuthorColor } from '@/lib/authorColors';
import { inputClass } from '@/lib/formStyles';
import type { AuthorProfile } from '@/types';

const MAX_NICK = 20;
const MIN_PASSWORD = 6;

interface AuthFormProps {
  onAuthenticated: (profile: AuthorProfile) => void;
}

type Action = 'register' | 'login';

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [color, setColor] = useState<AuthorColor | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (action: Action): string | null => {
    if (!nick.trim()) return 'Введите ник';
    if (password.length < MIN_PASSWORD) return `Пароль должен быть не короче ${MIN_PASSWORD} символов`;
    if (action === 'register' && !color) return 'Выберите цвет';
    return null;
  };

  const runAction = async (action: Action) => {
    const validationError = validate(action);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(action);
    setError(null);
    try {
      const trimmedNick = nick.trim();
      const profile =
        action === 'register'
          ? await registerAccount({ nick: trimmedNick, password, color: color as AuthorColor })
          : await loginAccount({ nick: trimmedNick, password });
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так, попробуйте еще раз');
    } finally {
      setPending(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction('login');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex min-h-9 items-center justify-center">
        {color && nick.trim() ? (
          <AuthorName name={nick.trim()} color={color} />
        ) : (
          <span className="text-sm text-stone-500 dark:text-stone-400">Ваш ник появится здесь</span>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Ваш ник</span>
        <input
          value={nick}
          onChange={(event) => setNick(event.target.value)}
          maxLength={MAX_NICK}
          autoComplete="username"
          placeholder="Например, Челик228"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Пароль</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder={`Не короче ${MIN_PASSWORD} символов`}
          className={inputClass}
        />
      </label>

      <NickColorPicker value={color} onChange={setColor} />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void runAction('register')}
          disabled={pending !== null}
          className="flex items-center justify-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          {pending === 'register' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Регистрация
        </button>
        <button
          type="submit"
          disabled={pending !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400 dark:disabled:bg-stone-700"
        >
          {pending === 'login' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Войти
        </button>
      </div>
    </form>
  );
}
