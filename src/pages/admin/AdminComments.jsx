import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, shortText } from './adminUtils';

function AdminComments() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ keyword: '', postId: '' });
  const [page, setPage] = useState(0);
  const [commentsPage, setCommentsPage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getComments(accessToken, {
        keyword: filters.keyword,
        postId: filters.postId ? Number(filters.postId) : null,
        page,
        size: 20,
      });
      setCommentsPage(data);
    } catch (err) {
      setError(extractErrorMessage(err, '댓글 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters.keyword, filters.postId, page]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await adminApi.deleteComment(accessToken, commentId);
      await fetchComments();
    } catch (err) {
      alert(extractErrorMessage(err, '댓글 삭제에 실패했습니다.'));
    }
  };

  const comments = commentsPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>댓글 관리</h2>
      </header>

      <div className="admin-filter-row">
        <input
          value={filters.keyword}
          placeholder="댓글 내용 검색"
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          className="admin-input"
        />
        <input
          value={filters.postId}
          placeholder="게시글 ID"
          onChange={(e) => setFilters((prev) => ({ ...prev, postId: e.target.value }))}
          className="admin-input"
        />
        <button type="button" onClick={() => setPage(0)} className="admin-btn">검색</button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>댓글</th>
              <th>게시글ID</th>
              <th>게시글 미리보기</th>
              <th>작성자</th>
              <th>대댓글</th>
              <th>삭제여부</th>
              <th>작성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="9" className="admin-empty-cell">로딩 중...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="9" className="admin-empty-cell">검색 결과가 없습니다.</td></tr>
            ) : (
              comments.map((comment) => (
                <tr key={comment.id}>
                  <td>{comment.id}</td>
                  <td>{shortText(comment.content, 40)}</td>
                  <td>{comment.postId}</td>
                  <td>{shortText(comment.postContentPreview, 24)}</td>
                  <td>{comment.author?.name || '-'}</td>
                  <td>{comment.parentId ? `Y (${comment.parentId})` : 'N'}</td>
                  <td>{comment.isDeleted ? 'Y' : 'N'}</td>
                  <td>{formatDateTime(comment.createdAt)}</td>
                  <td>
                    <button type="button" onClick={() => handleDelete(comment.id)} className="admin-btn danger">
                      삭제
                    </button>
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
        <span>{(commentsPage?.number ?? 0) + 1} / {commentsPage?.totalPages || 1}</span>
        <button
          type="button"
          disabled={commentsPage?.last ?? true}
          onClick={() => setPage((prev) => prev + 1)}
          className="admin-btn"
        >
          다음
        </button>
      </div>
    </section>
  );
}

export default AdminComments;

