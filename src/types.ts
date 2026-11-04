export interface Board {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface Post {
  id: number;
  board_id: string;
  thread_id: number | null;
  subject: string;
  body: string;
  author_name: string;
  author_id: string;
  author_color: string | null;
  author_role: string | null;
  author_verified: boolean;
  image_path: string | null;
  author_avatar_path?: string | null;
  reply_count: number;
  garlic_count: number;
  bumped_at: string;
  created_at: string;
}

export interface AuthorProfile {
  nick: string;
  color: string;
  avatar_path: string | null;
  role: string | null;
  is_verified: boolean;
}

export interface ThreadWithBoard extends Post {
  board: { slug: string; title: string } | null;
}

export interface BoardPageData {
  board: Board;
  threads: Post[];
  reactedPostIds: number[];
}

export interface ChatMessage {
  id: number;
  author_id: string;
  author_name: string;
  author_color: string | null;
  author_role: string | null;
  author_verified: boolean;
  author_avatar_path?: string | null;
  body: string;
  created_at: string;
  is_pinned: boolean;
}

export interface ThreadPageData {
  op: ThreadWithBoard;
  replies: Post[];
  reactedPostIds: number[];
}
