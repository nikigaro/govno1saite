import { useState } from 'react';

interface AvatarProps {
  url: string | null | undefined;
  name: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
};

export default function Avatar({ url, name, size = 'md' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const sizeClass = SIZE_CLASSES[size];

  if (url && url !== failedUrl) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(url)}
        className={`${sizeClass} shrink-0 rounded-lg border border-stone-200 object-cover dark:border-stone-700`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-lg bg-stone-200 font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-200`}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  );
}
