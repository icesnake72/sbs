import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, USER_ROLE, USER_STATUS } from './adminUtils';

function AdminUsers() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ keyword: '', status: '', role: '' });
  const [page, setPage] = useState(0);
  const [usersPage, setUsersPage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getUsers(accessToken, {
        ...filters,
        page,
        size: 20,
      });
      setUsersPage(data);
    } catch (err) {
      setError(extractErrorMessage(err, '사용자 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (userId, status) => {
    try {
      const reason = window.prompt('상태 변경 사유를 입력하세요.', '') || '';
      await adminApi.changeUserStatus(accessToken, userId, { status, reason });
      await fetchUsers();
    } catch (err) {
      alert(extractErrorMessage(err, '상태 변경에 실패했습니다.'));
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await adminApi.changeUserRole(accessToken, userId, { role });
      await fetchUsers();
    } catch (err) {
      alert(extractErrorMessage(err, '역할 변경에 실패했습니다.'));
    }
  };

  const handleForceLogout = async (userId) => {
    if (!window.confirm('해당 사용자를 강제 로그아웃하시겠습니까?')) return;
    try {
      const data = await adminApi.forceLogout(accessToken, userId);
      alert(`폐기된 refresh token: ${data?.revokedRefreshTokens ?? 0}`);
    } catch (err) {
      alert(extractErrorMessage(err, '강제 로그아웃에 실패했습니다.'));
    }
  };

  const users = usersPage?.content || [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>사용자 관리</h2>
      </header>

      <div className="admin-filter-row">
        <input
          value={filters.keyword}
          placeholder="이메일/이름 검색"
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          className="admin-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className="admin-select"
        >
          <option value="">전체 상태</option>
          {USER_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select
          value={filters.role}
          onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
          className="admin-select"
        >
          <option value="">전체 역할</option>
          {USER_ROLE.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <button type="button" onClick={() => setPage(0)} className="admin-btn">검색</button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>이메일</th>
              <th>이름</th>
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
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td><Link to={`/admin/users/${user.id}`}>{user.name}</Link></td>
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td>{user.postCount}</td>
                  <td>{user.followerCount}</td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  <td>{formatDateTime(user.lastLoginAt)}</td>
                  <td>
                    <div className="admin-inline-actions">
                      <select
                        defaultValue={user.status}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className="admin-select mini"
                      >
                        {USER_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <select
                        defaultValue={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="admin-select mini"
                      >
                        {USER_ROLE.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <button type="button" onClick={() => handleForceLogout(user.id)} className="admin-btn danger">
                        로그아웃
                      </button>
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
        <span>{(usersPage?.number ?? 0) + 1} / {usersPage?.totalPages || 1}</span>
        <button
          type="button"
          disabled={usersPage?.last ?? true}
          onClick={() => setPage((prev) => prev + 1)}
          className="admin-btn"
        >
          다음
        </button>
      </div>
    </section>
  );
}

export default AdminUsers;

