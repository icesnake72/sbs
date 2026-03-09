import { Link } from 'react-router-dom';
import { normalizeImageUrl } from '../utils/imageUrl';
import UserDmMenu from './UserDmMenu';

/**
 * PostCard 컴포넌트
 *
 * 게시글 목록에서 각 게시글을 카드 형태로 표시합니다.
 * 클릭하면 게시글 상세 페이지로 이동합니다.
 *
 * @param {Object} props.post - 게시글 데이터 (PostListResponse 또는 PostResponse)
 */
function PostCard({ post }) {
  // 작성 시간을 "몇 분 전" 형태로 변환
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 게시글 내용 미리보기 (최대 150자)
  const previewContent = post.content?.length > 150
    ? post.content.substring(0, 150) + '...'
    : post.content;

  // 작성자 정보 (author 객체 또는 직접 필드)
  const authorName = post.author?.name || post.userName || '알 수 없음';
  const authorId = post.author?.id || post.userId || null;
  // normalizeImageUrl: 백엔드가 반환하는 :8080 포트 URL을 /uploads/... 상대경로로 변환
  const authorImage = normalizeImageUrl(post.author?.profileImage || post.userProfileImage || null);

  return (
    <article className="post-card">
      {/* 작성자 정보 헤더 */}
      <div className="post-card-header">
        <div className="post-card-author">
          <UserDmMenu
            targetUserId={authorId}
            targetUserName={authorName}
            imageUrl={authorImage}
            avatarClassName="post-card-avatar"
            placeholderClassName="post-card-avatar-placeholder"
          />
          <span className="post-card-author-name">{authorName}</span>
        </div>
        <span className="post-card-time">{formatTime(post.createdAt)}</span>
      </div>

      <Link to={`/posts/${post.id}`} className="post-card-main-link">
        {/* 게시글 내용 */}
        <div className="post-card-content">
          <p>{previewContent}</p>
        </div>

        {/* 썸네일 이미지 (있는 경우) */}
        {(post.thumbnailUrl || (post.images && post.images.length > 0)) && (
          <div className="post-card-thumbnail">
            <img
              src={normalizeImageUrl(post.thumbnailUrl || post.images[0]?.imageUrl || post.images[0]?.thumbnailUrl)}
              alt="게시글 이미지"
            />
            {/* 이미지 개수 표시 (2개 이상인 경우) */}
            {(post.imageCount > 1 || (post.images && post.images.length > 1)) && (
              <span className="post-card-image-count">
                +{(post.imageCount || post.images?.length) - 1}
              </span>
            )}
          </div>
        )}

        {/* 하단 통계 (좋아요, 댓글, 조회수) */}
        <div className="post-card-footer">
          <span className="post-card-stat">♥ {post.likeCount || 0}</span>
          <span className="post-card-stat">💬 {post.commentCount || 0}</span>
          <span className="post-card-stat">👁 {post.viewCount || 0}</span>
        </div>
      </Link>
    </article>
  );
}

export default PostCard;
