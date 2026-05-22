import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import {
  createComment,
  createPost,
  deletePost,
  fetchChatMessages,
  fetchPostComments,
  fetchPosts,
  likePostRemote,
  sendChatMessage,
  subscribeCommunity,
} from '../services/communityService';
import { useAppStore } from '../store/useAppStore';
import type {
  BadgeTier,
  ChatMessage,
  CommunityPost,
  DataMode,
  PostComment,
  PostFireStats,
  PostType,
} from '../types';

export type CommunityView = 'feed' | 'chat' | 'rank';

export interface CreatePostInput {
  content: string;
  postType: PostType;
  attachPortfolio: boolean;
  attachFireStats: boolean;
  stockRatio: number;
  cashRatio: number;
  fireStats?: PostFireStats;
}

export function useCommunity(
  badgeTier: BadgeTier,
  isLoggedIn: boolean,
  userId: string | null,
  view: CommunityView
) {
  const localPosts = useAppStore((s) => s.posts);
  const localComments = useAppStore((s) => s.postComments);
  const localChat = useAppStore((s) => s.chatMessages);
  const addPostLocal = useAppStore((s) => s.addPost);
  const removePostLocal = useAppStore((s) => s.removePostLocal);
  const likePostLocal = useAppStore((s) => s.likePost);
  const addCommentLocal = useAppStore((s) => s.addCommentLocal);
  const addChatLocal = useAppStore((s) => s.addChatMessage);

  const cloud = isSupabaseEnabled();
  const mode: DataMode = cloud ? 'cloud' : 'local';

  const [posts, setPosts] = useState<CommunityPost[]>(cloud ? [] : localPosts);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(cloud ? [] : localChat);
  const [commentCache, setCommentCache] = useState<Record<string, PostComment[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!cloud || !isLoggedIn) return;

      const silent = opts?.silent ?? hasLoadedRef.current;
      if (!silent) setLoading(true);

      try {
        if (view === 'feed' || view === 'rank') {
          setPosts(await fetchPosts(userId));
        } else if (view === 'chat') {
          setChatMessages(await fetchChatMessages(userId));
        }
        setError(null);
        hasLoadedRef.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : '연동 오류');
      } finally {
        setLoading(false);
      }
    },
    [cloud, isLoggedIn, userId, view]
  );

  useEffect(() => {
    if (!cloud) {
      setPosts(localPosts);
      setChatMessages(localChat);
      hasLoadedRef.current = true;
      return;
    }
    if (!isLoggedIn) {
      setPosts([]);
      setChatMessages([]);
      hasLoadedRef.current = false;
      return;
    }

    hasLoadedRef.current = false;
    refresh();

    const debounced = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => refresh({ silent: true }), 400);
    };

    const unsub = subscribeCommunity(debounced);
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cloud, isLoggedIn, view, refresh, localPosts, localChat]);

  const postsWithLocalComments = useMemo(() => {
    if (cloud) return posts;
    return posts.map((p) => ({
      ...p,
      commentCount: (localComments[p.id]?.length ?? 0) || p.commentCount,
    }));
  }, [cloud, posts, localComments]);

  const addPost = async (input: CreatePostInput) => {
    if (!cloud) {
      addPostLocal({
        content: input.content,
        postType: input.postType,
        attachPortfolio: input.attachPortfolio,
        attachFireStats: input.attachFireStats,
        stockRatio: input.stockRatio,
        cashRatio: input.cashRatio,
        fireStats: input.fireStats,
        badgeTier,
      });
      return;
    }
    await createPost({ ...input, badgeTier });
    await refresh({ silent: true });
  };

  const likePost = async (id: string) => {
    if (!cloud) {
      likePostLocal(id);
      return;
    }
    await likePostRemote(id);
    await refresh({ silent: true });
  };

  const addChatMessage = async (text: string) => {
    if (!cloud) {
      addChatLocal(text);
      return;
    }
    await sendChatMessage(text);
    await refresh({ silent: true });
  };

  const removePost = async (id: string) => {
    if (!cloud) {
      removePostLocal(id);
      return;
    }
    await deletePost(id);
    await refresh({ silent: true });
  };

  const loadComments = async (postId: string): Promise<PostComment[]> => {
    if (!cloud) {
      const list = localComments[postId] ?? [];
      setCommentCache((c) => ({ ...c, [postId]: list }));
      return list;
    }
    const list = await fetchPostComments(postId, userId);
    setCommentCache((c) => ({ ...c, [postId]: list }));
    return list;
  };

  const addComment = async (postId: string, content: string) => {
    if (!cloud) {
      addCommentLocal(postId, content);
      const list = useAppStore.getState().postComments[postId] ?? [];
      setCommentCache((c) => ({ ...c, [postId]: list }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
      );
      return;
    }
    await createComment(postId, content);
    const list = await fetchPostComments(postId, userId);
    setCommentCache((c) => ({ ...c, [postId]: list }));
    await refresh({ silent: true });
  };

  const getComments = (postId: string): PostComment[] => {
    if (cloud) return commentCache[postId] ?? [];
    return localComments[postId] ?? commentCache[postId] ?? [];
  };

  return {
    mode,
    posts: postsWithLocalComments,
    chatMessages,
    loading,
    error,
    addPost,
    likePost,
    addChatMessage,
    removePost,
    loadComments,
    addComment,
    getComments,
    refresh: () => refresh({ silent: false }),
  };
}
