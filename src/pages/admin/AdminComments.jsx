import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  ConfirmModal, extractErrorMessage, formatDate,
  Pagination, shortText,
} from './adminUtils';

/**
 * 어드민 댓글 관리 페이지
 * - 댓글 목록 (검색: 내용/작성자, 게시글 ID 필터)
 * - 댓글/대댓글 구분 표시
 * - 삭제된 댓글은 deleted-row 클래스 + 삭제 버튼 비활성화
 * - ConfirmModal로 삭제 확인
 * - Pagination 컴포넌트로 페이지 이동
 */
function AdminComments() {
  const { accessToken } = useAuth();

  // ── 필터 입력값 (검색 버튼/엔터 전까지 API 호출 안 함) ──
  const [inputKeyword, setInputKeyword] = useState('');
  const [inputPostId, setInputPostId] = useState('');

  // ── 실제 적용된 필터 ──
  const [appliedFilters, setAppliedFilters] = useState({ keyword: '', postId: '' });

  // ── 현재 페이지 번호 (0-indexed) ──
  const [page, setPage] = useState(0);

  // ── 서버에서 받은 페이지 데이터 ──
  const [commentsPage, setCommentsPage] = useState(null);

  // ── 로딩 / 에러 상태 ──
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 삭제 모달: 삭제할 commentId ──
  const [deleteModal, setDeleteModal] = useState(null);

  // ── 댓글 목록 조회 ──
  const fetchComments = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getComments(accessToken, {
        keyword: appliedFilters.keyword || undefined,
        postId: appliedFilters.postId ? Number(appliedFilters.postId) : undefined,
        page,
        size: 20,
      });
      setCommentsPage(data);
    } catch (err) {
      setError(extractErrorMessage(err, '댓글 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, appliedFilters, page]);

  // 필터 또는 페이지 변경 시 목록 재조회
  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── 검색 적용 (1페이지로 이동) ──
  const applySearch = () => {
    setAppliedFilters({ keyword: inputKeyword, postId: inputPostId });
    setPage(0);
  };

  // ── 댓글 삭제 확인 (Soft Delete) ──
  const confirmDelete = async () => {
    try {
      await adminApi.deleteComment(accessToken, deleteModal);
      setDeleteModal(null);
      await fetchComments();
    } catch (err) {
      alert(extractErrorMessage(err, '댓글 삭제에 실패했습니다.'));
    }
  };

  // 현재 페이지의 댓글 목록
  const comments = commentsPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>💬 댓글 관리</h2>
        {/* 전체 댓글 수 표시 */}
        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
          총 {(commentsPage?.totalElements ?? 0).toLocaleString()}개
        </span>
      </header>

      {/* 필터 영역: 키워드 검색, 게시글 ID 필터 */}
      <div className="admin-filter-row">
        {/* 키워드 입력 (Enter 키로 검색 가능) */}
        <input
          value={inputKeyword}
          placeholder="댓글 내용/작성자 검색"
          onChange={(e) => setInputKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="admin-input"
        />
        {/* 게시글 ID 입력 (숫자만, Enter 키로 검색 가능) */}
        <input
          value={inputPostId}
          placeholder="게시글 ID"
          onChange={(e) => setInputPostId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="admin-input"
          style={{ minWidth: '120px', maxWidth: '140px' }}
          type="number"
          min="1"
        />
        <button type="button" onClick={applySearch} className="admin-btn">🔍 검색</button>
      </div>

      {/* 에러 메시지 */}
      {error && <p className="admin-error">{error}</p>}

      {/* 댓글 목록 테이블 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>구분</th>
              <th>댓글 내용</th>
              <th>게시글 ID</th>
              <th>게시글 미리보기</th>
              <th>작성자</th>
              <th>♥</th>
              <th>상태</th>
              <th>작성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="10" className="admin-empty-cell">로딩 중...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="10" className="admin-empty-cell">검색 결과가 없습니다.</td></tr>
            ) : (
              comments.map((comment) => (
                // 삭제된 댓글 행에 deleted-row 클래스 적용 (CSS에서 투명도 낮춤)
                <tr key={comment.id} className={comment.isDeleted ? 'deleted-row' : ''}>
                  {/* 댓글 ID */}
                  <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{comment.id}</td>
                  {/* 댓글/대댓글 구분 표시 */}
                  <td style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    {comment.parentId
                      ? <span style={{ color: '#60a5fa' }}>↳ 대댓글</span>
                      : <span style={{ color: '#94a3b8' }}>댓글</span>
                    }
                  </td>
                  {/* 댓글 내용 (40자 제한) */}
                  <td>{shortText(comment.content, 40)}</td>
                  {/* 게시글 ID */}
                  <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>{comment.postId}</td>
                  {/* 게시글 미리보기 (28자 제한) */}
                  <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{shortText(comment.postContentPreview, 28)}</td>
                  {/* 작성자: 이름 + 이메일 */}
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>{comment.author?.name || '-'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{comment.author?.email || ''}</div>
                  </td>
                  {/* 좋아요 수 */}
                  <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{comment.likeCount ?? 0}</td>
                  {/* 댓글 상태: 삭제됨 / 정상 */}
                  <td>
                    {comment.isDeleted
                      ? <span style={{ color: '#f87171', fontSize: '0.72rem', fontWeight: 700 }}>삭제됨</span>
                      : <span style={{ color: '#34d399', fontSize: '0.72rem', fontWeight: 700 }}>정상</span>
                    }
                  </td>
                  {/* 작성일 */}
                  <td style={{ fontSize: '0.8rem' }}>{formatDate(comment.createdAt)}</td>
                  {/* 삭제 버튼 (이미 삭제된 댓글은 비활성화) */}
                  <td>
                    <button
                      type="button"
                      disabled={comment.isDeleted}
                      onClick={() => setDeleteModal(comment.id)}
                      className="admin-btn danger"
                      style={{
                        opacity: comment.isDeleted ? 0.35 : 1,
                        cursor: comment.isDeleted ? 'default' : 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 컴포넌트 */}
      <Pagination currentPage={page} totalPages={commentsPage?.totalPages ?? 0} onPageChange={setPage} />

      {/* ── 삭제 확인 모달 ── */}
      <ConfirmModal
        isOpen={!!deleteModal}
        title="댓글 삭제"
        message="이 댓글을 삭제하시겠습니까? (Soft Delete)"
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </section>
  );
}

export default AdminComments;
