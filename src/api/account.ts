import { announceAuthorProfile, fetchAuthorProfile } from '@/api/author';
import { getAuthorId, resetAuthorId, setAuthorId } from '@/lib/anonymous';
import { supabase } from '@/lib/supabase';
import type { AuthorProfile } from '@/types';

const GENERIC_ERROR = 'Что-то пошло не так, попробуйте еще раз';
const WRONG_CREDENTIALS = 'Неверный ник или пароль';
const NICK_TAKEN = 'Этот ник уже занят';
const RAISE_EXCEPTION_CODE = 'P0001';

interface ErrorLike {
  code?: string;
  message: string;
}

function readableDbError(error: ErrorLike): string {
  return error.code === RAISE_EXCEPTION_CODE ? error.message : GENERIC_ERROR;
}

export async function fetchCurrentAccount(): Promise<AuthorProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('author_accounts')
    .select('author_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Не удалось загрузить аккаунт');
  const account = data as { author_id: string } | null;
  if (!account) return null;

  setAuthorId(account.author_id);
  return fetchAuthorProfile();
}

interface RegisterInput {
  nick: string;
  password: string;
  color: string;
}

export async function registerAccount({ nick, password, color }: RegisterInput): Promise<AuthorProfile> {
  const { data: email, error: emailError } = await supabase.rpc('begin_nick_registration', { p_nick: nick });
  if (emailError) throw new Error(readableDbError(emailError));

  const { error: signUpError } = await supabase.auth.signUp({ email: email as string, password });
  if (signUpError) {
    throw new Error(/already/i.test(signUpError.message) ? NICK_TAKEN : GENERIC_ERROR);
  }

  resetAuthorId();
  const { data, error } = await supabase.rpc('claim_author_account', {
    p_author_id: getAuthorId(),
    p_nick: nick,
    p_color: color,
  });
  if (error) {
    await supabase.auth.signOut();
    throw new Error(readableDbError(error));
  }

  const profile = data as AuthorProfile;
  announceAuthorProfile(profile);
  return profile;
}

interface LoginInput {
  nick: string;
  password: string;
}

export async function loginAccount({ nick, password }: LoginInput): Promise<AuthorProfile> {
  const { data: email, error: emailError } = await supabase.rpc('nick_account_email', { p_nick: nick });
  if (emailError) throw new Error(readableDbError(emailError));

  const { error } = await supabase.auth.signInWithPassword({ email: email as string, password });
  if (error) throw new Error(error.status === 400 ? WRONG_CREDENTIALS : GENERIC_ERROR);

  const profile = await fetchCurrentAccount();
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error(GENERIC_ERROR);
  }
  announceAuthorProfile(profile);
  return profile;
}

export async function logoutAccount(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(GENERIC_ERROR);
  resetAuthorId();
  announceAuthorProfile(null);
}

interface UpdateProfileInput {
  nick: string;
  color: string;
}

export async function updateAccountProfile({ nick, color }: UpdateProfileInput): Promise<AuthorProfile> {
  const { data, error } = await supabase.rpc('update_author_profile', { p_nick: nick, p_color: color });
  if (error) throw new Error(readableDbError(error));

  const profile = data as AuthorProfile;
  announceAuthorProfile(profile);
  return profile;
}
