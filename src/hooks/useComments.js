import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config';

/**
 * useComments 커스텀 훅
 *
 * 게시글 댓글 관련 상태와 API 통신을 관리합니다.
 * - 댓글 목록 조회: GET /api/posts/{postId}/comments
 * - 댓글 작성: POST /api/posts/{postId}/comments
 * - 댓글 삭제: DELETE /api/comments/{id}
 *
 * @param {string|number} postId - 대상 게시글 ID
 * @param {string|null} accessToken - 인증 토큰
 */
function useComments(postId, accessToken) {
  // 댓글 목록
  const [comments, setComments] = useState([]);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 댓글 작성 중 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 에러 메시지
  const [error, setError] = useState(null);

  /**
   * 댓글 목록을 서버에서 불러옵니다.
   * GET /api/posts/{postId}/comments?page=0&size=20
   */
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.postComments}/${postId}/comments`;
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, {
        params: { page: 0, size: 50 },
        headers,
        withCredentials: true,
      });

      console.log('댓글 목록 응답:', response.data);

      // 응답 구조: { success, data: { content: [...] } } 또는 { success, data: [...] }
      const raw = response.data?.data;
      if (Array.isArray(raw)) {
        setComments(raw);
      } else if (Array.isArray(raw?.content)) {
        setComments(raw.content);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error('댓글 목록 조회 실패:', err);
      setError('댓글을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, accessToken]);

  /**
   * 댓글을 작성합니다.
   * POST /api/posts/{postId}/comments
   * body: { content }
   *
   * @param {string} content - 댓글 내용
   * @returns {boolean} 성공 여부
   */
  const addComment = useCallback(async (content) => {
    if (!content?.trim()) return false;
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      return false;
    }

    setIsSubmitting(true);
    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.postComments}/${postId}/comments`;
      const response = await axios.post(
        url,
        { content: content.trim() },
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          withCredentials: true,
        }
      );

      console.log('댓글 작성 응답:', response.data);

      // 작성한 댓글을 로컬 목록에 즉시 추가
      const newComment = response.data?.data || response.data;
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      } else {
        // 응답에서 댓글을 받지 못한 경우 목록을 다시 조회
        await fetchComments();
      }
      return true;
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [postId, accessToken, fetchComments]);

  /**
   * 댓글을 삭제합니다.
   * DELETE /api/comments/{commentId}
   *
   * @param {string|number} commentId - 삭제할 댓글 ID
   * @returns {boolean} 성공 여부
   */
  const deleteComment = useCallback(async (commentId) => {
    if (!accessToken) return false;

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.comments}/${commentId}`;
      await axios.delete(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true,
      });

      // 로컬 목록에서 즉시 제거
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      return true;
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
      return false;
    }
  }, [accessToken]);

  /**
   * 댓글 좋아요를 토글합니다.
   * - 좋아요 추가: POST /api/comments/{commentId}/like
   * - 좋아요 취소: DELETE /api/comments/{commentId}/like
   *
   * Optimistic update: UI를 먼저 변경하고 API 실패 시 롤백합니다.
   *
   * @param {string|number} commentId - 대상 댓글 ID
   * @param {boolean} currentLiked - 현재 좋아요 여부 (호출 시점의 상태를 직접 전달)
   * @returns {boolean} 성공 여부
   */
  const toggleCommentLike = useCallback(async (commentId, currentLiked) => {
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      return false;
    }

    const newLiked = !currentLiked;

    // Optimistic update: UI 즉시 반영
    setComments((prev) =>
      prev.map((c) =>
        c.id !== commentId
          ? c
          : {
              ...c,
              liked: newLiked,
              likeCount: newLiked
                ? (c.likeCount || 0) + 1
                : Math.max((c.likeCount || 0) - 1, 0),
            }
      )
    );

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.commentLike}/${commentId}/like`;
      const config = {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true,
      };

      if (currentLiked) {
        // 좋아요 취소
        await axios.delete(url, config);
      } else {
        // 좋아요 추가
        await axios.post(url, {}, config);
      }
      return true;
    } catch (err) {
      console.error('댓글 좋아요 처리 실패:', err);
      // API 실패 시 Optimistic update 롤백
      setComments((prev) =>
        prev.map((c) =>
          c.id !== commentId
            ? c
            : {
                ...c,
                liked: currentLiked,
                likeCount: currentLiked
                  ? (c.likeCount || 0) + 1
                  : Math.max((c.likeCount || 0) - 1, 0),
              }
        )
      );
      return false;
    }
  }, [accessToken]);

  return {
    comments,
    isLoading,
    isSubmitting,
    error,
    fetchComments,
    addComment,
    deleteComment,
    toggleCommentLike,
  };
}

export default useComments;
