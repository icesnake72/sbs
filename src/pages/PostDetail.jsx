import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import { normalizeImageUrl } from '../utils/imageUrl';
import './PostDetail.css';

/**
 * PostDetail 컴포넌트
 *
 * 게시글 상세 조회 페이지입니다.
 * - 게시글 전체 내용 표시
 * - 작성자 정보 (프로필 이미지, 이름)
 * - 첨부 이미지 갤러리
 * - 본인 게시글인 경우 삭제 버튼
 * - 좋아요, 댓글, 조회수 통계
 */
function PostDetail() {
  const { id } = useParams();           // URL에서 게시글 ID 추출
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  // 게시글 상세 데이터
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * 게시글 상세 데이터를 서버에서 가져옵니다.
   * GET /api/posts/{id}
   */
  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;

      // 헤더 구성 (인증 토큰이 있으면 포함)
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, {
        headers,
        withCredentials: true
      });

      console.log('게시글 상세 조회 응답:', response.data);

      // 응답 데이터에서 게시글 추출
      if (response.data?.data) {
        setPost(response.data.data);
      } else {
        setPost(response.data);
      }
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

  // 컴포넌트 마운트 시 게시글 조회
  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

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
        withCredentials: true
      });

      alert('게시글이 삭제되었습니다.');
      navigate('/posts');
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  /**
   * 작성 시간을 "YYYY.MM.DD HH:mm" 형식으로 변환합니다.
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 작성자 정보 추출 (author 객체 또는 직접 필드)
  const authorName = post?.author?.name || post?.userName || '알 수 없음';
  // normalizeImageUrl: 백엔드의 :8080 포트 URL을 /uploads/... 상대경로로 변환
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
          /* 로딩 상태 */
          <div className="post-detail-loading">
            <p>게시글을 불러오는 중...</p>
          </div>
        ) : error ? (
          /* 에러 상태 */
          <div className="post-detail-error">
            <p>{error}</p>
            <button onClick={() => navigate('/posts')} className="back-button">
              목록으로 돌아가기
            </button>
          </div>
        ) : post ? (
          /* 게시글 상세 내용 */
          <div className="post-detail-card">
            {/* 작성자 정보 헤더 */}
            <div className="post-detail-header">
              <div className="post-detail-author">
                {authorImage ? (
                  <img src={authorImage} alt={authorName} className="post-detail-avatar" />
                ) : (
                  <div className="post-detail-avatar-placeholder">
                    {authorName.charAt(0)}
                  </div>
                )}
                <div className="post-detail-author-info">
                  <span className="post-detail-author-name">{authorName}</span>
                  <span className="post-detail-date">{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {/* 본인 게시글인 경우 삭제 버튼 */}
              {isOwner && (
                <div className="post-detail-actions">
                  <button onClick={handleDelete} className="delete-button">
                    삭제
                  </button>
                </div>
              )}
            </div>

            {/* 게시글 본문 */}
            <div className="post-detail-content">
              {/* 줄바꿈 처리를 위해 whitespace: pre-wrap 사용 */}
              <p>{post.content}</p>
            </div>

            {/* 첨부 이미지 갤러리 */}
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

            {/* 하단 통계 */}
            <div className="post-detail-stats">
              <span className="post-detail-stat">♥ {post.likeCount || 0}</span>
              <span className="post-detail-stat">💬 {post.commentCount || 0}</span>
              <span className="post-detail-stat">👁 {post.viewCount || 0}</span>
            </div>

            {/* 공개 범위 표시 */}
            {post.visibility && post.visibility !== 'PUBLIC' && (
              <div className="post-detail-visibility">
                {post.visibility === 'PRIVATE' ? '🔒 비공개' : '👥 팔로워만'}
              </div>
            )}

            {/* 목록으로 돌아가기 */}
            <div className="post-detail-footer">
              <button onClick={() => navigate('/posts')} className="back-button">
                ← 목록으로
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <Footer />
    </>
  );
}

export default PostDetail;
