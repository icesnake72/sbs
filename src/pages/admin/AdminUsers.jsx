import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  ConfirmModal, extractErrorMessage, formatDate, formatDateTime,
  Pagination, RoleBadge, StatusBadge, USER_ROLE, USER_STATUS,
} from './adminUtils';

function AdminUsers() {
  const { accessToken } = useAuth();

  // ── 필터 입력값 (검색 버튼/엔터 전까지 API 호출 안 함) ──
  const [inputKeyword, setInputKeyword] = useState('');
  const [inputStatus, setInputStatus] = useState('');
  const [inputRole, setInputRole] = useState('');

  // ── 실제 적용된 필터 (검색 버튼 클릭 시 반영) ──
  const [appliedFilters, setAppliedFilters] = useState({ keyword: '', status: '', role: '' });

  // ── 현재 페이지 번호 (0-indexed) ──
  const [page, setPage] = useState(0);

  // ── 서버에서 받은 페이지 데이터 ──
  const [usersPage, setUsersPage] = useState(null);

  // ── 로딩 / 에러 상태 ──
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 상태변경 모달 상태: { userId, userName, currentStatus } ──
  const [statusModal, setStatusModal] = useState(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // ── 역할변경 모달 상태: { userId, userName, currentRole } ──
  const [roleModal, setRoleModal] = useState(null);
  const [pendingRole, setPendingRole] = useState('');

  // ── 강제 로그아웃 모달 상태: { userId, userName } ──
  const [logoutModal, setLogoutModal] = useState(null);

  // ── 사용자 목록 조회 ──
  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getUsers(accessToken, {
        keyword: appliedFilters.keyword || undefined,
        status: appliedFilters.status || undefined,
        role: appliedFilters.role || undefined,
        page,
        size: 20,
      });
      setUsersPage(data);
    } catch (err) {
      setError(extractErrorMessage(err, '사용자 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, appliedFilters, page]);

  // 필터 또는 페이지 변경 시 목록 재조회
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── 검색 적용 (입력값을 appliedFilters에 반영하고 1페이지로 이동) ──
  const applySearch = () => {
    setAppliedFilters({ keyword: inputKeyword, status: inputStatus, role: inputRole });
    setPage(0);
  };

  // ── Enter 키 입력 시 검색 실행 ──
  const handleKeyDown = (e) => { if (e.key === 'Enter') applySearch(); };

  // ── 상태변경 모달 열기 ──
  const openStatusModal = (user) => {
    setStatusModal({ userId: user.id, userName: user.name, currentStatus: user.status });
    setPendingStatus(user.status);
    setStatusReason('');
  };

  // ── 상태변경 확인: API 호출 후 목록 갱신 ──
  const confirmStatusChange = async () => {
    try {
      await adminApi.changeUserStatus(accessToken, statusModal.userId, {
        status: pendingStatus,
        reason: statusReason || undefined,
      });
      setStatusModal(null);
      await fetchUsers();
    } catch (err) {
      alert(extractErrorMessage(err, '상태 변경에 실패했습니다.'));
    }
  };

  // ── 역할변경 모달 열기 ──
  const openRoleModal = (user) => {
    setRoleModal({ userId: user.id, userName: user.name, currentRole: user.role });
    setPendingRole(user.role);
  };

  // ── 역할변경 확인: API 호출 후 목록 갱신 ──
  const confirmRoleChange = async () => {
    try {
      await adminApi.changeUserRole(accessToken, roleModal.userId, { role: pendingRole });
      setRoleModal(null);
      await fetchUsers();
    } catch (err) {
      alert(extractErrorMessage(err, '역할 변경에 실패했습니다.'));
    }
  };

  // ── 강제 로그아웃 확인: 모든 Refresh Token 무효화 ──
  const confirmForceLogout = async () => {
    try {
      const data = await adminApi.forceLogout(accessToken, logoutModal.userId);
      alert(`강제 로그아웃 완료 (무효화된 토큰: ${data?.revokedRefreshTokens ?? 0}개)`);
      setLogoutModal(null);
    } catch (err) {
      alert(extractErrorMessage(err, '강제 로그아웃에 실패했습니다.'));
    }
  };

  // 현재 페이지의 사용자 목록
  const users = usersPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>👥 사용자 관리</h2>
        {/* 전체 사용자 수 표시 */}
        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
          총 {(usersPage?.totalElements ?? 0).toLocaleString()}명
        </span>
      </header>

      {/* 필터 영역: 키워드 검색, 상태 필터, 역할 필터 */}
      <div className="admin-filter-row">
        {/* 키워드 입력 (Enter 키로 검색 가능) */}
        <input
          value={inputKeyword}
          placeholder="이메일/이름 검색"
          onChange={(e) => setInputKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="admin-input"
        />
        {/* 상태 필터 select (controlled) */}
        <select value={inputStatus} onChange={(e) => setInputStatus(e.target.value)} className="admin-select">
          <option value="">전체 상태</option>
          {USER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* 역할 필터 select (controlled) */}
        <select value={inputRole} onChange={(e) => setInputRole(e.target.value)} className="admin-select">
          <option value="">전체 역할</option>
          {USER_ROLE.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="button" onClick={applySearch} className="admin-btn">🔍 검색</button>
      </div>

      {/* 에러 메시지 */}
      {error && <p className="admin-error">{error}</p>}

      {/* 사용자 목록 테이블 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th>상태</th>
              <th>게시글</th>
              <th>팔로워</th>
              <th>가입일</th>
              <th>최근 로그인</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="10" className="admin-empty-cell">로딩 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="10" className="admin-empty-cell">검색 결과가 없습니다.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  {/* 사용자 ID (작게 표시) */}
                  <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{user.id}</td>
                  {/* 사용자 이름: 상세 페이지 링크, 슈퍼유저이면 SUPER 배지 표시 */}
                  <td>
                    <Link to={`/admin/users/${user.id}`} style={{ fontWeight: 600 }}>{user.name}</Link>
                    {user.isSuperUser && <span className="admin-super-badge">SUPER</span>}
                  </td>
                  {/* 이메일 (작게 표시) */}
                  <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>{user.email}</td>
                  {/* 역할 배지 */}
                  <td><RoleBadge role={user.role} /></td>
                  {/* 상태 배지 */}
                  <td><StatusBadge status={user.status} /></td>
                  {/* 게시글 수 */}
                  <td style={{ textAlign: 'right' }}>{user.postCount ?? 0}</td>
                  {/* 팔로워 수 */}
                  <td style={{ textAlign: 'right' }}>{user.followerCount ?? 0}</td>
                  {/* 가입일 */}
                  <td style={{ fontSize: '0.8rem' }}>{formatDate(user.createdAt)}</td>
                  {/* 최근 로그인 */}
                  <td style={{ fontSize: '0.8rem' }}>{formatDate(user.lastLoginAt)}</td>
                  {/* 관리 버튼: 상태변경 / 역할변경 / 강제로그아웃 */}
                  <td>
                    <div className="admin-inline-actions">
                      <button type="button" onClick={() => openStatusModal(user)} className="admin-btn">상태</button>
                      <button type="button" onClick={() => openRoleModal(user)} className="admin-btn">역할</button>
                      <button type="button" onClick={() => setLogoutModal({ userId: user.id, userName: user.name })} className="admin-btn danger">로그아웃</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 컴포넌트 */}
      <Pagination currentPage={page} totalPages={usersPage?.totalPages ?? 0} onPageChange={setPage} />

      {/* ── 상태 변경 모달 ── */}
      <ConfirmModal
        isOpen={!!statusModal}
        title={`상태 변경 — ${statusModal?.userName}`}
        message="변경할 상태를 선택하고 사유를 입력하세요."
        confirmText="변경"
        danger
        extra={
          <>
            {/* 변경할 상태 선택 select */}
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="admin-select"
              style={{ width: '100%', marginBottom: '8px' }}
            >
              {USER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* 변경 사유 입력 textarea (선택 입력) */}
            <textarea
              className="admin-textarea"
              placeholder="변경 사유 (선택)"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </>
        }
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusModal(null)}
      />

      {/* ── 역할 변경 모달 ── */}
      <ConfirmModal
        isOpen={!!roleModal}
        title={`역할 변경 — ${roleModal?.userName}`}
        message="변경할 역할을 선택하세요."
        confirmText="변경"
        danger
        extra={
          <select
            value={pendingRole}
            onChange={(e) => setPendingRole(e.target.value)}
            className="admin-select"
            style={{ width: '100%' }}
          >
            {USER_ROLE.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        }
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleModal(null)}
      />

      {/* ── 강제 로그아웃 모달 ── */}
      <ConfirmModal
        isOpen={!!logoutModal}
        title="강제 로그아웃"
        message={`${logoutModal?.userName}의 모든 Refresh Token을 무효화합니다. 계속하시겠습니까?`}
        confirmText="강제 로그아웃"
        danger
        onConfirm={confirmForceLogout}
        onCancel={() => setLogoutModal(null)}
      />
    </section>
  );
}

export default AdminUsers;
