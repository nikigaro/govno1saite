import { useEffect, useState } from 'react';
import { AUTHOR_PROFILE_CHANGED_EVENT, fetchAuthorProfile } from '@/api/author';
import { getAuthorId } from '@/lib/anonymous';
import { supabase } from '@/lib/supabase';
import type { AuthorProfile } from '@/types';

const PRESENCE_CHANNEL = 'online-visitors';
const ANONYMOUS_NICK = 'НеЧелик';

export interface OnlineUser {
  id: string;
  nick: string;
  color: string | null;
}

interface PresencePayload {
  nick: string;
  color: string | null;
}

function toPayload(profile: AuthorProfile | null): PresencePayload {
  return { nick: profile?.nick ?? ANONYMOUS_NICK, color: profile?.color ?? null };
}

export function useOnlineUsers(): OnlineUser[] | null {
  const [users, setUsers] = useState<OnlineUser[] | null>(null);

  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: getAuthorId() } },
    });
    let subscribed = false;

    const track = (profile: AuthorProfile | null) => channel.track(toPayload(profile));

    const handleProfileChanged = (event: Event) => {
      if (!subscribed) return;
      void track((event as CustomEvent<AuthorProfile | null>).detail);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePayload>();
        const next = Object.entries(state).map(([id, presences]) => ({
          id,
          nick: presences[0].nick,
          color: presences[0].color,
        }));
        next.sort((a, b) => a.nick.localeCompare(b.nick, 'ru'));
        setUsers(next);
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        subscribed = true;
        const profile = await fetchAuthorProfile().catch(() => null);
        await track(profile);
      });

    window.addEventListener(AUTHOR_PROFILE_CHANGED_EVENT, handleProfileChanged);
    return () => {
      window.removeEventListener(AUTHOR_PROFILE_CHANGED_EVENT, handleProfileChanged);
      void supabase.removeChannel(channel);
    };
  }, []);

  return users;
}
