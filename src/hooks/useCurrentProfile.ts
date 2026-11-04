import { useEffect, useState } from 'react';
import { fetchCurrentAccount } from '@/api/account';
import { AUTHOR_PROFILE_CHANGED_EVENT } from '@/api/author';
import type { AuthorProfile } from '@/types';

interface CurrentProfileState {
  profile: AuthorProfile | null;
  ready: boolean;
}

export function useCurrentProfile(): CurrentProfileState {
  const [state, setState] = useState<CurrentProfileState>({ profile: null, ready: false });

  useEffect(() => {
    let active = true;
    fetchCurrentAccount()
      .then((profile) => {
        if (active) setState({ profile, ready: true });
      })
      .catch(() => {
        if (active) setState({ profile: null, ready: true });
      });

    const handleChange = (event: Event) => {
      const profile = (event as CustomEvent<AuthorProfile | null>).detail;
      setState({ profile, ready: true });
    };
    window.addEventListener(AUTHOR_PROFILE_CHANGED_EVENT, handleChange);
    return () => {
      active = false;
      window.removeEventListener(AUTHOR_PROFILE_CHANGED_EVENT, handleChange);
    };
  }, []);

  return state;
}
