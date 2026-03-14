import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  ConfirmModal, extractErrorMessage, formatDate,
  Pagination, POST_VISIBILITY, shortText, VisibilityBadge,
} from './adminUtils';

function AdminPosts() {
  const { accessToken } = useAuth();

  // ── 필터 입력값 (검색 버튼/엔터 전까지 API 호출 안 함) ──
  const [inputKeyword, setInputKeyword] = useState('');
  const [inputIsDeleted, setInputIsDeleted] = useState('');

  // ── 실제 적용된 필터 ──
  const [appliedFilters, setAppliedFilters] = useState({ keyword: '', isDeleted: '' });

  // ── 현재 페이지 번호 (0-indexed) ──
  const [page, setPage] = useState(0);

  // ── 서버에서 받은 페이지 데이터 ──
  const [postsPage, setPostsPage] = useState(null);

  // ── 로딩 / 에러 상태 ──
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 삭제 모달: 삭제할 postId ──
  const [deleteModal, setDeleteModal] = useState(null);

  // ── 복구 모달: 복구할 postId ──
  const [restoreModal, setRestoreModal] = useState(null);

  // ── 공개범위 변경 모달: { postId, current } ──
  const [visModal, setVisModal] = useState(null);
  const [pendingVis, setPendingVis] = useState('PUBLIC');

  // ── 게시글 목록 조회 ──
  const fetchPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      // 삭제여부 필터: '' → undefined, 'true'/'false' → boolean
      const rawDeleted = appliedFilters.isDeleted;
      const isDeleted = rawDeleted === '' ? undefined : rawDeleted === 'true';
      const data = await adminApi.getPosts(accessToken, {
        keyword: appliedFilters.keyword || undefined,
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
  }, [accessToken, appliedFilters, page]);

  // 필터 또는 페이지 변경 시 목록 재조회
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── 검색 적용 (1페이지로 이동) ──
  const applySearch = () => {
    setAppliedFilters({ keyword: inputKeyword, isDeleted: inputIsDeleted });
    setPage(0);
  };

  // ── 게시글 삭제 확인: Soft Delete ──
  const confirmDelete = async () => {
    try {
      await adminApi.deletePost(accessToken, deleteModal);
      setDeleteModal(null);
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 삭제에 실패했습니다.'));
    }
  };

  // ── 게시글 복구 확인 ──
  const confirmRestore = async () => {
    try {
      await adminApi.restorePost(accessToken, restoreModal);
      setRestoreModal(null);
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 복구에 실패했습니다.'));
    }
  };

  // ── 공개범위 변경 확인 ──
  const confirmVisibility = async () => {
    try {
      await adminApi.changePostVisibility(accessToken, visModal.postId, { visibility: pendingVis });
      setVisModal(null);
      await fetchPosts();
    } catch (err) {
      alert(extractErrorMessage(err, '공개 범위 변경에 실패했습니다.'));
    }
  };

  // 현재 페이지의 게시글 목록
  const posts = postsPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>📝 게시글 관리</h2>
        {/* 전체 게시글 수 표시 */}
        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
          총 {(postsPage?.totalElements ?? 0).toLocaleString()}개
        </span>
      </header>

      {/* 필터 영역: 키워드 검색, 삭제여부 필터 */}
      <div className="admin-filter-row">
        {/* 키워드 입력 (Enter 키로 검색 가능) */}
        <input
          value={inputKeyword}
          placeholder="내용/작성자 검색"
          onChange={(e) => setInputKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="admin-input"
        />
        {/* 삭제여부 필터 select */}
        <select value={inputIsDeleted} onChange={(e) => setInputIsDeleted(e.target.value)} className="admin-select">
          <option value="">전체</option>
          <option value="false">정상 게시글</option>
          <option value="true">삭제된 게시글</option>
        </select>
        <button type="button" onClick={applySearch} className="admin-btn">🔍 검색</button>
      </div>

      {/* 에러 메시지 */}
      {error && <p className="admin-error">{error}</p>}

      {/* 게시글 목록 테이블 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>작성자</th>
              <th>내용</th>
              <th>공개범위</th>
              <th>♥</th>
              <th>💬</th>
              <th>👁</th>
              <th>이미지</th>
              <th>상태</th>
              <th>작성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="11" className="admin-empty-cell">로딩 중...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan="11" className="admin-empty-cell">검색 결과가 없습니다.</td></tr>
            ) : (
              posts.map((post) => (
                // 삭제된 게시글 행에 deleted-row 클래스 적용 (CSS에서 투명도 낮춤)
                <tr key={post.id} className={post.isDeleted ? 'deleted-row' : ''}>
                  {/* 게시글 ID */}
                  <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{post.id}</td>
                  {/* 작성자: 이름 + 이메일 */}
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>{post.author?.name || '-'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{post.author?.email || ''}</div>
                  </td>
                  {/* 게시글 내용 미리보기 (40자 제한, 클릭 시 상세 이동) */}
                  <td>
                    <Link to={`/admin/posts/${post.id}`}>{shortText(post.content, 40)}</Link>
                  </td>
                  {/* 공개범위 배지 */}
                  <td><VisibilityBadge visibility={post.visibility} /></td>
                  {/* 좋아요 수 */}
                  <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{post.likeCount ?? 0}</td>
                  {/* 댓글 수 */}
                  <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{post.commentCount ?? 0}</td>
                  {/* 조회수 */}
                  <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{post.viewCount ?? 0}</td>
                  {/* 이미지 수 */}
                  <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>{post.imageCount ?? '-'}</td>
                  {/* 게시글 상태: 삭제됨 / 정상 */}
                  <td>
                    {post.isDeleted
                      ? <span style={{ color: '#f87171', fontSize: '0.72rem', fontWeight: 700 }}>삭제됨</span>
                      : <span style={{ color: '#34d399', fontSize: '0.72rem', fontWeight: 700 }}>정상</span>
                    }
                  </td>
                  {/* 작성일 */}
                  <td style={{ fontSize: '0.8rem' }}>{formatDate(post.createdAt)}</td>
                  {/* 관리 버튼: 공개범위 변경 / 삭제 또는 복구 */}
                  <td>
                    <div className="admin-inline-actions">
                      {/* 공개범위 변경 버튼: 클릭 시 현재 공개범위로 초기화 */}
                      <button
                        type="button"
                        onClick={() => { setVisModal({ postId: post.id, current: post.visibility }); setPendingVis(post.visibility); }}
                        className="admin-btn"
                        style={{ fontSize: '0.75rem' }}
                      >공개범위</button>
                      {/* 삭제된 게시글은 복구 버튼, 정상 게시글은 삭제 버튼 */}
                      {post.isDeleted ? (
                        <button type="button" onClick={() => setRestoreModal(post.id)} className="admin-btn">복구</button>
                      ) : (
                        <button type="button" onClick={() => setDeleteModal(post.id)} className="admin-btn danger">삭제</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 컴포넌트 */}
      <Pagination currentPage={page} totalPages={postsPage?.totalPages ?? 0} onPageChange={setPage} />

      {/* ── 삭제 확인 모달 ── */}
      <ConfirmModal
        isOpen={!!deleteModal}
        title="게시글 삭제"
        message="이 게시글을 삭제하시겠습니까? (Soft Delete — 복구 가능)"
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />

      {/* ── 복구 확인 모달 ── */}
      <ConfirmModal
        isOpen={!!restoreModal}
        title="게시글 복구"
        message="삭제된 게시글을 복구하시겠습니까?"
        confirmText="복구"
        onConfirm={confirmRestore}
        onCancel={() => setRestoreModal(null)}
      />

      {/* ── 공개범위 변경 모달 ── */}
      <ConfirmModal
        isOpen={!!visModal}
        title="공개 범위 변경"
        message="변경할 공개 범위를 선택하세요."
        confirmText="변경"
        extra={
          <select value={pendingVis} onChange={(e) => setPendingVis(e.target.value)} className="admin-select" style={{ width: '100%' }}>
            {POST_VISIBILITY.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        }
        onConfirm={confirmVisibility}
        onCancel={() => setVisModal(null)}
      />
    </section>
  );
}

export default AdminPosts;
