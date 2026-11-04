interface AuthorNameProps {
  name: string;
  color: string | null;
  role?: string | null;
  verified?: boolean;
}

interface BadgeImage {
  src: string;
  label: string;
}

const ROLE_BADGES: Record<string, BadgeImage> = {
  admin: { src: '/admin.png', label: 'Администратор' },
};

const VERIFIED_BADGE: BadgeImage = { src: '/original.png', label: 'Подтвержденный аккаунт' };

function BadgeIcon({ badge }: { badge: BadgeImage }) {
  return (
    <img
      src={badge.src}
      alt={badge.label}
      title={badge.label}
      className="h-4 w-4 shrink-0 object-contain [image-rendering:pixelated]"
    />
  );
}

export default function AuthorName({ name, color, role, verified = false }: AuthorNameProps) {
  const roleBadge = role ? ROLE_BADGES[role] : undefined;
  const content = (
    <>
      {roleBadge && <BadgeIcon badge={roleBadge} />}
      {name}
      {verified && <BadgeIcon badge={VERIFIED_BADGE} />}
    </>
  );

  if (!color) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
        {content}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-2 py-0.5 font-semibold leading-normal shadow-sm dark:bg-black"
      style={{ color }}
    >
      {content}
    </span>
  );
}
