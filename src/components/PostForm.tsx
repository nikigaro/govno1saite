import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { validateImageFile } from '@/api/imageboard';
import { fetchAuthorProfile } from '@/api/author';
import AuthorName from '@/components/AuthorName';
import { useLoader } from '@/hooks/useLoader';
import { getCooldownRemainingMs } from '@/lib/anonymous';
import { inputClass } from '@/lib/formStyles';

export interface PostDraft {
  subject: string;
  body: string;
  image: File | null;
}

interface PostFormProps {
  mode: 'thread' | 'reply';
  submitLabel: string;
  onSubmit: (draft: PostDraft) => Promise<void>;
  onCancel?: () => void;
}

const MAX_SUBJECT = 120;
const MAX_BODY = 4000;

export default function PostForm({ mode, submitLabel, onSubmit, onCancel }: PostFormProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(getCooldownRemainingMs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, loading: profileLoading } = useLoader(fetchAuthorProfile, []);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = window.setTimeout(() => setCooldownMs(getCooldownRemainingMs()), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownMs]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setFormError(problem);
      event.target.value = '';
      return;
    }
    setFormError(null);
    setImage(file);
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedBody = body.trim();

    if (mode === 'thread' && !image) {
      setFormError('Для нового треда прикрепите картинку');
      return;
    }
    if (mode === 'thread' && !trimmedBody) {
      setFormError('Напишите текст сообщения');
      return;
    }
    if (!trimmedBody && !image) {
      setFormError('Напишите текст или прикрепите картинку');
      return;
    }
    if (cooldownMs > 0) {
      setFormError(`Подождите ${Math.ceil(cooldownMs / 1000)} с перед следующим сообщением`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ subject: subject.trim(), body: trimmedBody, image });
      setSubject('');
      setBody('');
      removeImage();
      setCooldownMs(getCooldownRemainingMs());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
    } finally {
      setSubmitting(false);
    }
  };

  const cooldownSeconds = Math.ceil(cooldownMs / 1000);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 text-stone-900 shadow-sm sm:p-5 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 animate-fade-in"
    >
      {!profileLoading && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Пишете как{' '}
          <AuthorName name={profile?.nick ?? 'Аноним'} color={profile?.color ?? null} />
          <span className="ml-2 text-xs text-stone-500 dark:text-stone-500">ник меняется на главной странице</span>
        </p>
      )}

      {mode === 'thread' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Тема</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={MAX_SUBJECT}
            placeholder="О чем пойдет речь"
            className={inputClass}
          />
        </label>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Сообщение{mode === 'thread' ? '' : ' (необязательно, если есть картинка)'}
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={MAX_BODY}
          rows={mode === 'thread' ? 5 : 3}
          placeholder="Текст сообщения. Строка, начинающаяся с >, станет зеленой, а >>123 сошлется на сообщение"
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        {previewUrl ? (
          <div className="relative">
            <img src={previewUrl} alt="Предпросмотр картинки" className="h-24 w-auto rounded-lg object-cover" />
            <button
              type="button"
              onClick={removeImage}
              aria-label="Убрать картинку"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white shadow transition-transform hover:scale-110"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-emerald-500 hover:text-emerald-700 dark:border-stone-700 dark:text-stone-300 dark:hover:text-emerald-400">
            <ImagePlus size={18} aria-hidden="true" />
            Прикрепить картинку
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        )}
        <p className="text-xs text-stone-500 dark:text-stone-400">JPEG, PNG, GIF или WebP до 5 МБ</p>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {cooldownSeconds > 0 ? `Следующее сообщение через ${cooldownSeconds} с` : `${body.length} / ${MAX_BODY}`}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || cooldownSeconds > 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400 dark:disabled:bg-stone-700"
          >
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
