import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  ConfirmModal, extractErrorMessage, formatDate, formatDateTime,
  RoleBadge, StatusBadge, USER_ROLE, USER_STATUS,
} from './adminUtils';

function AdminUserDetail() {
  // URL 파라미터에서 사용자 ID 추출
  const { id } = useParams();
  // 현재 로그인한 관리자 정보와 액세스 토큰
  const { user: me, accessToken } = useAuth();

  // 사용자 상세 정보 상태
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ── 상태변경 모달 상태 ──
  const [statusModal, setStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // ── 역할변경 모달 상태 ──
  const [roleModal, setRoleModal] = useState(false);
  const [pendingRole, setPendingRole] = useState('');

  // ── 강제 로그아웃 모달 상태 ──
  const [logoutModal, setLogoutModal] = useState(false);

  // ── 사용자 상세 조회 함수 ──
  const fetchDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getUserDetail(accessToken, id);
      setDetail(data);
      // 초기값: 현재 상태/역할로 설정
      setPendingStatus(data?.status || 'ACTIVE');
      setPendingRole(data?.role || 'ROLE_USER');
    } catch (err) {
      setError(extractErrorMessage(err, '사용자 상세를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  // ── 보호 여부: 슈퍼유저이거나 본인 계정이면 상태/역할 변경 제한 ──
  const isSelf = Number(me?.id) === Number(detail?.id);
  const isProtected = detail?.isSuperUser || isSelf;

  // ── 상태변경 확인: API 호출 후 상세 재조회 ──
  const confirmStatusChange = async () => {
    try {
      await adminApi.changeUserStatus(accessToken, id, { status: pendingStatus, reason: statusReason || undefined });
      setStatusModal(false);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '상태 변경에 실패했습니다.'));
    }
  };

  // ── 역할변경 확인: API 호출 후 상세 재조회 ──
  const confirmRoleChange = async () => {
    try {
      await adminApi.changeUserRole(accessToken, id, { role: pendingRole });
      setRoleModal(false);
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '역할 변경에 실패했습니다.'));
    }
  };

  // ── 강제 로그아웃 확인: 모든 Refresh Token 무효화 ──
  const confirmForceLogout = async () => {
    try {
      const data = await adminApi.forceLogout(accessToken, id);
      alert(`강제 로그아웃 완료 (무효화된 토큰: ${data?.revokedRefreshTokens ?? 0}개)`);
      setLogoutModal(false);
    } catch (err) {
      alert(extractErrorMessage(err, '강제 로그아웃에 실패했습니다.'));
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>
          👤 사용자 상세
          {/* 사용자 ID 표시 */}
          {detail && <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>#{detail.id}</span>}
          {/* 슈퍼유저 배지 */}
          {detail?.isSuperUser && <span className="admin-super-badge">SUPER USER</span>}
        </h2>
        <Link to="/admin/users" className="admin-btn ghost">← 목록으로</Link>
      </header>

      {/* 에러 / 로딩 표시 */}
      {error && <p className="admin-error">{error}</p>}
      {isLoading && <p className="admin-empty-cell">로딩 중...</p>}

      {detail && (
        <>
          {/* 기본 정보 + 프로필/통계 2열 그리드 */}
          <div className="admin-detail-grid">
            {/* 기본 정보 패널 */}
            <article className="admin-panel">
              <h3>기본 정보</h3>
              <ul className="admin-kv">
                <li><span>이메일</span><strong>{detail.email}</strong></li>
                <li><span>이름</span><strong>{detail.name}</strong></li>
                <li>
                  <span>역할</span>
                  {/* 역할 배지 표시 */}
                  <strong><RoleBadge role={detail.role} /></strong>
                </li>
                <li>
                  <span>상태</span>
                  {/* 상태 배지 표시 */}
                  <strong><StatusBadge status={detail.status} /></strong>
                </li>
                <li><span>Provider</span><strong>{detail.provider || '-'}</strong></li>
                <li><span>가입일</span><strong>{formatDateTime(detail.createdAt)}</strong></li>
                <li><span>최근 로그인</span><strong>{formatDateTime(detail.lastLoginAt)}</strong></li>
                <li><span>로그인 실패</span><strong>{detail.failedLoginAttempts ?? 0}회</strong></li>
                <li><span>활성 여부</span><strong>{detail.isActive ? '✅ 활성' : '❌ 비활성'}</strong></li>
              </ul>
            </article>

            {/* 프로필 + 활동통계 패널 */}
            <article className="admin-panel">
              <h3>프로필 정보</h3>
              <ul className="admin-kv">
                {/* 성과 이름을 합쳐서 표시 */}
                <li><span>성/이름</span><strong>{[detail.profile?.lastName, detail.profile?.firstName].filter(Boolean).join(' ') || '-'}</strong></li>
                <li><span>전화번호</span><strong>{detail.profile?.phoneNumber || '-'}</strong></li>
                <li><span>생년월일</span><strong>{formatDate(detail.profile?.birth)}</strong></li>
              </ul>
              <h3 style={{ marginTop: '1rem' }}>활동 통계</h3>
              <ul className="admin-kv">
                <li><span>게시글</span><strong>{(detail.stats?.postCount ?? 0).toLocaleString()}</strong></li>
                <li><span>댓글</span><strong>{(detail.stats?.commentCount ?? 0).toLocaleString()}</strong></li>
                <li><span>좋아요</span><strong>{(detail.stats?.likeCount ?? 0).toLocaleString()}</strong></li>
                <li><span>팔로워</span><strong>{(detail.stats?.followerCount ?? 0).toLocaleString()}</strong></li>
                <li><span>팔로잉</span><strong>{(detail.stats?.followingCount ?? 0).toLocaleString()}</strong></li>
                <li><span>북마크</span><strong>{(detail.stats?.bookmarkCount ?? 0).toLocaleString()}</strong></li>
              </ul>
            </article>
          </div>

          {/* 관리 액션 패널 */}
          <section className="admin-panel">
            <h3>⚡ 관리 액션</h3>
            {/* 슈퍼유저/본인 계정은 변경 제한 안내 */}
            {isProtected && (
              <p className="admin-note" style={{ color: '#fbbf24', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                ⚠️ {detail.isSuperUser ? '슈퍼유저' : '본인'} 계정은 상태/역할 변경이 제한됩니다.
              </p>
            )}
            <div className="admin-inline-actions">
              {/* 상태 변경 버튼 (보호된 계정은 비활성화) */}
              <button
                type="button"
                disabled={isProtected}
                onClick={() => { setPendingStatus(detail.status); setStatusReason(''); setStatusModal(true); }}
                className="admin-btn"
              >
                상태 변경
              </button>
              {/* 역할 변경 버튼 (보호된 계정은 비활성화) */}
              <button
                type="button"
                disabled={isProtected}
                onClick={() => { setPendingRole(detail.role); setRoleModal(true); }}
                className="admin-btn"
              >
                역할 변경
              </button>
              {/* 강제 로그아웃 버튼 (모든 계정에 허용) */}
              <button
                type="button"
                onClick={() => setLogoutModal(true)}
                className="admin-btn danger"
              >
                강제 로그아웃
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── 상태 변경 모달 ── */}
      <ConfirmModal
        isOpen={statusModal}
        title={`상태 변경 — ${detail?.name}`}
        message="변경할 상태를 선택하고 사유를 입력하세요."
        confirmText="변경"
        danger
        extra={
          <>
            {/* 변경할 상태 선택 select */}
            <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)} className="admin-select" style={{ width: '100%', marginBottom: '8px' }}>
              {USER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* 변경 사유 입력 textarea */}
            <textarea className="admin-textarea" placeholder="변경 사유 (선택)" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
          </>
        }
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusModal(false)}
      />

      {/* ── 역할 변경 모달 ── */}
      <ConfirmModal
        isOpen={roleModal}
        title={`역할 변경 — ${detail?.name}`}
        message="변경할 역할을 선택하세요."
        confirmText="변경"
        danger
        extra={
          <select value={pendingRole} onChange={(e) => setPendingRole(e.target.value)} className="admin-select" style={{ width: '100%' }}>
            {USER_ROLE.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        }
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleModal(false)}
      />

      {/* ── 강제 로그아웃 모달 ── */}
      <ConfirmModal
        isOpen={logoutModal}
        title="강제 로그아웃"
        message={`${detail?.name}의 모든 Refresh Token을 무효화합니다. 계속하시겠습니까?`}
        confirmText="강제 로그아웃"
        danger
        onConfirm={confirmForceLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </section>
  );
}

export default AdminUserDetail;
