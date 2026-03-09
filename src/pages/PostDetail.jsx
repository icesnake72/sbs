import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import useComments from '../hooks/useComments';
import { API_CONFIG } from '../config';
import { normalizeImageUrl } from '../utils/imageUrl';
import './PostDetail.css';

/**
 * PostDetail 컴포넌트
 *
 * 게시글 상세 조회 페이지입니다.
 * - 게시글 전체 내용 / 이미지 갤러리 표시
 * - 좋아요 토글 (POST|DELETE /api/posts/{postId}/like)
 * - 댓글 목록 조회 및 작성/삭제
 * - 조회수는 게시글 조회(GET /api/posts/{id}) 시 백엔드에서 자동 증가
 */
function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  // ── 게시글 상태 ──
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── 좋아요 상태 ──
  // liked: 현재 사용자가 좋아요를 눌렀는지 여부
  const [liked, setLiked] = useState(false);
  // likeCount: 현재 좋아요 수 (Optimistic update)
  const [likeCount, setLikeCount] = useState(0);
  // 좋아요 API 요청 중 중복 방지
  const [isLiking, setIsLiking] = useState(false);

  // ── 댓글 상태 ──
  const { comments, isLoading: isCommentsLoading, isSubmitting, fetchComments, addComment, deleteComment } = useComments(id, accessToken);
  // 새 댓글 입력창 내용
  const [commentInput, setCommentInput] = useState('');
  // 댓글 입력창 ref (작성 후 포커스 유지)
  const commentInputRef = useRef(null);

  /**
   * 게시글 상세 데이터 조회
   * GET /api/posts/{id}
   * - 조회 시 백엔드에서 viewCount 자동 증가
   */
  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, { headers, withCredentials: true });
      console.log('게시글 상세 조회 응답:', response.data);

      const data = response.data?.data || response.data;
      setPost(data);

      // 서버에서 받은 좋아요 정보로 초기 상태 설정
      setLiked(data?.liked ?? false);
      setLikeCount(data?.likeCount ?? 0);
    } catch (err) {
      console.error('게시글 상세 조회 실패:', err);
      if (err.response?.status === 404) {
        setError('게시글을 찾을 수 없습니다.');
      } else {
        setError('게시글을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, accessToken]);

  // 마운트 시 게시글 + 댓글 동시 조회
  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  /**
   * 좋아요 토글 핸들러
   * - 좋아요 추가: POST /api/posts/{postId}/like
   * - 좋아요 취소: DELETE /api/posts/{postId}/like
   * - Optimistic update: UI를 먼저 변경하고 API 실패 시 롤백
   */
  const handleLike = async () => {
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (isLiking) return;

    // Optimistic update (즉각 UI 반영)
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setIsLiking(true);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.postLike}/${id}/like`;
      const config = {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true,
      };

      if (prevLiked) {
        // 이미 좋아요 → 취소
        await axios.delete(url, config);
      } else {
        // 좋아요 추가
        await axios.post(url, {}, config);
      }
    } catch (err) {
      console.error('좋아요 처리 실패:', err);
      // API 실패 시 Optimistic update 롤백
      setLiked(prevLiked);
      setLikeCount(prevCount);
      alert('좋아요 처리에 실패했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  /**
   * 게시글 삭제 핸들러
   * DELETE /api/posts/{id}
   */
  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;
      await axios.delete(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        withCredentials: true,
      });
      alert('게시글이 삭제되었습니다.');
      navigate('/posts');
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  /**
   * 댓글 작성 핸들러
   */
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const success = await addComment(commentInput);
    if (success) {
      setCommentInput('');
      commentInputRef.current?.focus();
    }
  };

  /**
   * 댓글 삭제 핸들러
   * @param {number} commentId
   * @param {string} authorName - 확인 다이얼로그에 표시
   */
  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    await deleteComment(commentId);
  };

  /**
   * 작성 시간을 "YYYY.MM.DD HH:mm" 형식으로 변환
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${Y}.${M}.${D} ${h}:${m}`;
  };

  /**
   * 상대 시간 표시 ("5분 전" 등)
   */
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffMin = Math.floor((Date.now() - date) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    return formatDate(dateString);
  };

  // 작성자 정보 추출
  const authorName = post?.author?.name || post?.userName || '알 수 없음';
  const authorImage = normalizeImageUrl(post?.author?.profileImage || post?.userProfileImage || null);

  // 현재 사용자가 게시글 작성자인지 확인
  const isOwner = user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  );

  return (
    <>
      <GNB />
      <div className="post-detail-container">
        {isLoading ? (
          <div className="post-detail-loading"><p>게시글을 불러오는 중...</p></div>
        ) : error ? (
          <div className="post-detail-error">
            <p>{error}</p>
            <button onClick={() => navigate('/posts')} className="back-button">목록으로 돌아가기</button>
          </div>
        ) : post ? (
          <div className="post-detail-card">

            {/* ── 작성자 정보 헤더 ── */}
            <div className="post-detail-header">
              <div className="post-detail-author">
                {authorImage ? (
                  <img src={authorImage} alt={authorName} className="post-detail-avatar" />
                ) : (
                  <div className="post-detail-avatar-placeholder">{authorName.charAt(0)}</div>
                )}
                <div className="post-detail-author-info">
                  <span className="post-detail-author-name">{authorName}</span>
                  <span className="post-detail-date">{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {/* 본인 게시글: 삭제 버튼 */}
              {isOwner && (
                <div className="post-detail-actions">
                  <button onClick={handleDelete} className="delete-button">삭제</button>
                </div>
              )}
            </div>

            {/* ── 게시글 본문 ── */}
            <div className="post-detail-content">
              <p>{post.content}</p>
            </div>

            {/* ── 이미지 갤러리 ── */}
            {post.images && post.images.length > 0 && (
              <div className="post-detail-images">
                {post.images.map((image, index) => (
                  <div key={image.id || index} className="post-detail-image-item">
                    <img
                      src={normalizeImageUrl(image.imageUrl || image.url)}
                      alt={`게시글 이미지 ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── 통계 및 좋아요 버튼 ── */}
            <div className="post-detail-stats">
              {/* 좋아요 토글 버튼 */}
              <button
                className={`like-button ${liked ? 'liked' : ''}`}
                onClick={handleLike}
                disabled={isLiking}
                title={liked ? '좋아요 취소' : '좋아요'}
              >
                {liked ? '♥' : '♡'} {likeCount}
              </button>

              {/* 댓글 수 (읽기 전용) */}
              <span className="post-detail-stat stat-comment">
                💬 {comments.length || post.commentCount || 0}
              </span>

              {/* 조회수 (읽기 전용, 게시글 조회 시 자동 증가) */}
              <span className="post-detail-stat">
                👁 {post.viewCount || 0}
              </span>
            </div>

            {/* 공개 범위 */}
            {post.visibility && post.visibility !== 'PUBLIC' && (
              <div className="post-detail-visibility">
                {post.visibility === 'PRIVATE' ? '🔒 비공개' : '👥 팔로워만'}
              </div>
            )}

            {/* ═══════════════════════════════════════
                댓글 섹션
                ═══════════════════════════════════════ */}
            <div className="comment-section">
              <h3 className="comment-section-title">
                댓글 {comments.length > 0 ? `(${comments.length})` : ''}
              </h3>

              {/* 댓글 작성 폼 (로그인 사용자만) */}
              {accessToken ? (
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                  <textarea
                    ref={commentInputRef}
                    className="comment-input"
                    placeholder="댓글을 입력하세요..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    rows={2}
                    maxLength={500}
                    /* Shift+Enter: 줄바꿈, Enter만: 제출 */
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit(e);
                      }
                    }}
                  />
                  <div className="comment-form-footer">
                    <span className="comment-char-count">
                      {commentInput.length}/500
                    </span>
                    <button
                      type="submit"
                      className="comment-submit-btn"
                      disabled={isSubmitting || !commentInput.trim()}
                    >
                      {isSubmitting ? '등록 중...' : '등록'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="comment-login-prompt">
                  댓글을 작성하려면 <span onClick={() => navigate('/login')} className="comment-login-link">로그인</span>이 필요합니다.
                </p>
              )}

              {/* 댓글 목록 */}
              {isCommentsLoading ? (
                <p className="comment-loading">댓글을 불러오는 중...</p>
              ) : comments.length === 0 ? (
                <p className="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
              ) : (
                <ul className="comment-list">
                  {comments.map((comment) => {
                    // 댓글 작성자 정보
                    const cAuthorName = comment.author?.name || comment.userName || '알 수 없음';
                    const cAuthorImage = normalizeImageUrl(comment.author?.profileImage || comment.userProfileImage || null);
                    // 현재 사용자가 댓글 작성자인지 확인
                    const isCommentOwner = user && (
                      user.id === comment.userId ||
                      user.id === comment.author?.id ||
                      user.email === comment.author?.email
                    );

                    return (
                      <li key={comment.id} className="comment-item">
                        {/* 댓글 작성자 아바타 */}
                        <div className="comment-avatar-wrap">
                          {cAuthorImage ? (
                            <img src={cAuthorImage} alt={cAuthorName} className="comment-avatar" />
                          ) : (
                            <div className="comment-avatar-placeholder">
                              {cAuthorName.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* 댓글 본문 */}
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{cAuthorName}</span>
                            <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="comment-content">{comment.content}</p>
                        </div>

                        {/* 본인 댓글: 삭제 버튼 */}
                        {isCommentOwner && (
                          <button
                            className="comment-delete-btn"
                            onClick={() => handleCommentDelete(comment.id)}
                            title="댓글 삭제"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* ── 하단 네비게이션 ── */}
            <div className="post-detail-footer">
              <button onClick={() => navigate('/posts')} className="back-button">← 목록으로</button>
            </div>

          </div>
        ) : null}
      </div>
      <Footer />
    </>
  );
}

export default PostDetail;
