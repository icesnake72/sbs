import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, POST_VISIBILITY } from './adminUtils';

function AdminPostDetail() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [post, setPost] = useState(null);
  const [visibility, setVisibility] = useState('PUBLIC');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getPostDetail(accessToken, id);
      setPost(data);
      setVisibility(data?.visibility || 'PUBLIC');
    } catch (err) {
      setError(extractErrorMessage(err, '게시글 상세를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deletePost(accessToken, id);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 삭제에 실패했습니다.'));
    }
  };

  const handleRestore = async () => {
    try {
      await adminApi.restorePost(accessToken, id);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 복구에 실패했습니다.'));
    }
  };

  const handleVisibility = async () => {
    try {
      await adminApi.changePostVisibility(accessToken, id, { visibility });
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '공개범위 변경에 실패했습니다.'));
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>게시글 상세</h2>
        <Link to="/admin/posts" className="admin-btn ghost">목록으로</Link>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {isLoading && <p className="admin-empty-cell">로딩 중...</p>}

      {post && (
        <>
          <article className="admin-panel">
            <h3>기본 정보</h3>
            <ul className="admin-kv">
              <li><span>ID</span><strong>{post.id}</strong></li>
              <li><span>작성자</span><strong>{post.author?.name} ({post.author?.email})</strong></li>
              <li><span>공개범위</span><strong>{post.visibility}</strong></li>
              <li><span>삭제여부</span><strong>{post.isDeleted ? 'Y' : 'N'}</strong></li>
              <li><span>좋아요/댓글/조회</span><strong>{post.likeCount} / {post.commentCount} / {post.viewCount}</strong></li>
              <li><span>작성일</span><strong>{formatDateTime(post.createdAt)}</strong></li>
            </ul>
            <p className="admin-content-box">{post.content}</p>
          </article>

          <section className="admin-panel">
            <h3>관리 액션</h3>
            <div className="admin-inline-actions">
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="admin-select">
                {POST_VISIBILITY.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <button type="button" onClick={handleVisibility} className="admin-btn">공개범위 변경</button>
              {post.isDeleted ? (
                <button type="button" onClick={handleRestore} className="admin-btn">복구</button>
              ) : (
                <button type="button" onClick={handleDelete} className="admin-btn danger">삭제</button>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default AdminPostDetail;

