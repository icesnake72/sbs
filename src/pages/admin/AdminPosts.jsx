import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, POST_VISIBILITY, shortText } from './adminUtils';

function AdminPosts() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ keyword: '', isDeleted: '' });
  const [page, setPage] = useState(0);
  const [postsPage, setPostsPage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const rawDeleted = filters.isDeleted;
      const isDeleted =
        rawDeleted === '' ? null : rawDeleted === 'true';

      const data = await adminApi.getPosts(accessToken, {
        keyword: filters.keyword,
        isDeleted,
        page,
        size: 20,
      });
      setPostsPage(data);
    } catch (err) {
      setError(extractErrorMessage(err, '게시글 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters.isDeleted, filters.keyword, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (postId) => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deletePost(accessToken, postId);
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 삭제에 실패했습니다.'));
    }
  };

  const handleRestore = async (postId) => {
    try {
      await adminApi.restorePost(accessToken, postId);
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 복구에 실패했습니다.'));
    }
  };

  const handleVisibility = async (postId, visibility) => {
    try {
      await adminApi.changePostVisibility(accessToken, postId, { visibility });
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '공개 범위 변경에 실패했습니다.'));
    }
  };

  const posts = postsPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>게시글 관리</h2>
      </header>

      <div className="admin-filter-row">
        <input
          value={filters.keyword}
          placeholder="게시글 내용 검색"
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          className="admin-input"
        />
        <select
          value={filters.isDeleted}
          onChange={(e) => setFilters((prev) => ({ ...prev, isDeleted: e.target.value }))}
          className="admin-select"
        >
          <option value="">전체</option>
          <option value="false">정상 게시글</option>
          <option value="true">삭제 게시글</option>
        </select>
        <button type="button" onClick={() => setPage(0)} className="admin-btn">검색</button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>작성자</th>
              <th>내용</th>
              <th>공개범위</th>
              <th>이미지수</th>
              <th>삭제여부</th>
              <th>작성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" className="admin-empty-cell">로딩 중...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan="8" className="admin-empty-cell">검색 결과가 없습니다.</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>{post.author?.name || '-'}</td>
                  <td>
                    <Link to={`/admin/posts/${post.id}`}>{shortText(post.content, 42)}</Link>
                  </td>
                  <td>{post.visibility}</td>
                  <td>{post.imageCount ?? '-'}</td>
                  <td>{post.isDeleted ? 'Y' : 'N'}</td>
                  <td>{formatDateTime(post.createdAt)}</td>
                  <td>
                    <div className="admin-inline-actions">
                      <select
                        defaultValue={post.visibility}
                        onChange={(e) => handleVisibility(post.id, e.target.value)}
                        className="admin-select mini"
                      >
                        {POST_VISIBILITY.map((visibility) => (
                          <option key={visibility} value={visibility}>{visibility}</option>
                        ))}
                      </select>
                      {post.isDeleted ? (
                        <button type="button" onClick={() => handleRestore(post.id)} className="admin-btn">
                          복구
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleDelete(post.id)} className="admin-btn danger">
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button type="button" disabled={page <= 0} onClick={() => setPage((prev) => prev - 1)} className="admin-btn">
          이전
        </button>
        <span>{(postsPage?.number ?? 0) + 1} / {postsPage?.totalPages || 1}</span>
        <button
          type="button"
          disabled={postsPage?.last ?? true}
          onClick={() => setPage((prev) => prev + 1)}
          className="admin-btn"
        >
          다음
        </button>
      </div>
    </section>
  );
}

export default AdminPosts;

