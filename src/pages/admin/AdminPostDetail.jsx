import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  ConfirmModal, extractErrorMessage, formatDateTime,
  POST_VISIBILITY, VisibilityBadge,
} from './adminUtils';

/**
 * 어드민 게시글 상세 페이지
 * - 게시글 기본 정보 (작성자, 공개범위, 삭제여부, 좋아요/댓글/조회 등)
 * - 관리 액션: 공개범위 변경, 삭제(Soft Delete), 복구
 * - 모든 액션은 ConfirmModal을 통해 확인 후 실행
 */
function AdminPostDetail() {
  // URL 파라미터에서 게시글 ID 추출
  const { id } = useParams();
  const { accessToken } = useAuth();

  // 게시글 상세 데이터 상태
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ── 모달 상태 관리 ──
  const [deleteModal, setDeleteModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [visModal, setVisModal] = useState(false);
  // 공개범위 변경 시 선택된 값
  const [pendingVis, setPendingVis] = useState('PUBLIC');

  // ── 게시글 상세 조회 ──
  const fetchDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getPostDetail(accessToken, id);
      setPost(data);
      // 현재 공개범위로 초기화
      setPendingVis(data?.visibility || 'PUBLIC');
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

  // ── 게시글 삭제 확인 (Soft Delete) ──
  const confirmDelete = async () => {
    try {
      await adminApi.deletePost(accessToken, id);
      setDeleteModal(false);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 삭제에 실패했습니다.'));
    }
  };

  // ── 게시글 복구 확인 ──
  const confirmRestore = async () => {
    try {
      await adminApi.restorePost(accessToken, id);
      setRestoreModal(false);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '게시글 복구에 실패했습니다.'));
    }
  };

  // ── 공개범위 변경 확인 ──
  const confirmVisibility = async () => {
    try {
      await adminApi.changePostVisibility(accessToken, id, { visibility: pendingVis });
      setVisModal(false);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '공개 범위 변경에 실패했습니다.'));
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>
          📄 게시글 상세
          {/* 게시글 ID 표시 */}
          {post && <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginLeft: '8px' }}>#{post.id}</span>}
        </h2>
        <Link to="/admin/posts" className="admin-btn ghost">← 목록으로</Link>
      </header>

      {/* 에러 / 로딩 표시 */}
      {error && <p className="admin-error">{error}</p>}
      {isLoading && <p className="admin-empty-cell">로딩 중...</p>}

      {post && (
        <>
          {/* 기본 정보 패널 */}
          <article className="admin-panel">
            <h3>기본 정보</h3>
            <ul className="admin-kv">
              <li>
                <span>작성자</span>
                <strong>
                  {post.author?.name}{' '}
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                    ({post.author?.email})
                  </span>
                </strong>
              </li>
              <li>
                <span>공개범위</span>
                {/* VisibilityBadge로 색상 배지 표시 */}
                <strong><VisibilityBadge visibility={post.visibility} /></strong>
              </li>
              <li>
                <span>삭제여부</span>
                <strong>
                  {post.isDeleted
                    ? <span style={{ color: '#f87171', fontWeight: 700 }}>삭제됨</span>
                    : <span style={{ color: '#34d399', fontWeight: 700 }}>정상</span>
                  }
                </strong>
              </li>
              <li>
                <span>좋아요 / 댓글 / 조회</span>
                <strong>{post.likeCount ?? 0} / {post.commentCount ?? 0} / {post.viewCount ?? 0}</strong>
              </li>
              {/* 이미지 수 (있을 때만 표시) */}
              {post.imageCount != null && (
                <li>
                  <span>이미지 수</span>
                  <strong>{post.imageCount}개</strong>
                </li>
              )}
              <li>
                <span>작성일</span>
                <strong>{formatDateTime(post.createdAt)}</strong>
              </li>
            </ul>

            {/* 게시글 본문 */}
            <h3 style={{ marginTop: '1.2rem' }}>게시글 내용</h3>
            <p className="admin-content-box">{post.content}</p>
          </article>

          {/* 관리 액션 패널 */}
          <section className="admin-panel">
            <h3>⚡ 관리 액션</h3>
            <div className="admin-inline-actions">
              {/* 공개범위 변경 버튼 */}
              <button
                type="button"
                onClick={() => { setPendingVis(post.visibility); setVisModal(true); }}
                className="admin-btn"
              >
                공개 범위 변경
              </button>
              {/* 삭제된 게시글은 복구 버튼, 정상 게시글은 삭제 버튼 */}
              {post.isDeleted ? (
                <button type="button" onClick={() => setRestoreModal(true)} className="admin-btn">
                  게시글 복구
                </button>
              ) : (
                <button type="button" onClick={() => setDeleteModal(true)} className="admin-btn danger">
                  게시글 삭제
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {/* ── 삭제 확인 모달 ── */}
      <ConfirmModal
        isOpen={deleteModal}
        title="게시글 삭제"
        message="이 게시글을 삭제하시겠습니까? (Soft Delete — 복구 가능)"
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(false)}
      />

      {/* ── 복구 확인 모달 ── */}
      <ConfirmModal
        isOpen={restoreModal}
        title="게시글 복구"
        message="삭제된 게시글을 복구하시겠습니까?"
        confirmText="복구"
        onConfirm={confirmRestore}
        onCancel={() => setRestoreModal(false)}
      />

      {/* ── 공개범위 변경 모달 ── */}
      <ConfirmModal
        isOpen={visModal}
        title="공개 범위 변경"
        message="변경할 공개 범위를 선택하세요."
        confirmText="변경"
        extra={
          <select
            value={pendingVis}
            onChange={(e) => setPendingVis(e.target.value)}
            className="admin-select"
            style={{ width: '100%' }}
          >
            {POST_VISIBILITY.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        }
        onConfirm={confirmVisibility}
        onCancel={() => setVisModal(false)}
      />
    </section>
  );
}

export default AdminPostDetail;
