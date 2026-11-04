const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatPostTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatReplyCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  let word = 'ответов';
  if (last === 1 && lastTwo !== 11) word = 'ответ';
  else if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) word = 'ответа';
  return `${count} ${word}`;
}
