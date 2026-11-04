import { Fragment } from 'react';

const QUOTE_PATTERN = /(>>\d+)/;

function scrollToPost(id: string) {
  document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderLine(line: string) {
  const isGreentext = line.startsWith('>') && !line.startsWith('>>');
  return (
    <span className={isGreentext ? 'text-emerald-700 dark:text-emerald-400' : undefined}>
      {line.split(QUOTE_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          <button
            key={index}
            type="button"
            onClick={() => scrollToPost(part.slice(2))}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {part}
          </button>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

interface PostBodyProps {
  text: string;
  clamp?: boolean;
}

export default function PostBody({ text, clamp = false }: PostBodyProps) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div
      className={`whitespace-pre-wrap break-words text-sm leading-normal text-stone-800 dark:text-stone-200 ${clamp ? 'line-clamp-6' : ''}`}
    >
      {lines.map((line, index) => (
        <Fragment key={index}>
          {renderLine(line)}
          {index < lines.length - 1 ? '\n' : null}
        </Fragment>
      ))}
    </div>
  );
}
