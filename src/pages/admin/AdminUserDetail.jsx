import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, USER_ROLE, USER_STATUS } from './adminUtils';

function AdminUserDetail() {
  const { id } = useParams();
  const { user: me, accessToken } = useAuth();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminApi.getUserDetail(accessToken, id);
      setDetail(data);
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

  const isSelf = Number(me?.id) === Number(detail?.id);
  const isProtected = detail?.isSuperUser || isSelf;

  const handleStatusChange = async (status) => {
    try {
      const reason = window.prompt('상태 변경 사유를 입력하세요.', '') || '';
      await adminApi.changeUserStatus(accessToken, id, { status, reason });
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '상태 변경에 실패했습니다.'));
    }
  };

  const handleRoleChange = async (role) => {
    try {
      await adminApi.changeUserRole(accessToken, id, { role });
      await fetchDetail();
    } catch (err) {
      alert(extractErrorMessage(err, '역할 변경에 실패했습니다.'));
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm('강제 로그아웃을 수행하시겠습니까?')) return;
    try {
      const data = await adminApi.forceLogout(accessToken, id);
      alert(`폐기된 refresh token: ${data?.revokedRefreshTokens ?? 0}`);
    } catch (err) {
      alert(extractErrorMessage(err, '강제 로그아웃에 실패했습니다.'));
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>사용자 상세</h2>
        <Link to="/admin/users" className="admin-btn ghost">목록으로</Link>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {isLoading && <p className="admin-empty-cell">로딩 중...</p>}

      {detail && (
        <>
          <div className="admin-detail-grid">
            <article className="admin-panel">
              <h3>기본 정보</h3>
              <ul className="admin-kv">
                <li><span>ID</span><strong>{detail.id}</strong></li>
                <li><span>이메일</span><strong>{detail.email}</strong></li>
                <li><span>이름</span><strong>{detail.name}</strong></li>
                <li><span>역할</span><strong>{detail.role}</strong></li>
                <li><span>상태</span><strong>{detail.status}</strong></li>
                <li><span>가입일</span><strong>{formatDateTime(detail.createdAt)}</strong></li>
                <li><span>최근 로그인</span><strong>{formatDateTime(detail.lastLoginAt)}</strong></li>
                <li><span>Provider</span><strong>{detail.provider || '-'}</strong></li>
                <li><span>실패 로그인</span><strong>{detail.failedLoginAttempts ?? 0}</strong></li>
              </ul>
              {detail.isSuperUser && <span className="admin-badge">SUPER USER</span>}
            </article>

            <article className="admin-panel">
              <h3>프로필</h3>
              <ul className="admin-kv">
                <li><span>성</span><strong>{detail.profile?.lastName || '-'}</strong></li>
                <li><span>이름</span><strong>{detail.profile?.firstName || '-'}</strong></li>
                <li><span>전화번호</span><strong>{detail.profile?.phoneNumber || '-'}</strong></li>
                <li><span>생년월일</span><strong>{formatDateTime(detail.profile?.birth)}</strong></li>
              </ul>
              <h3>활동 통계</h3>
              <ul className="admin-kv">
                <li><span>게시글</span><strong>{detail.stats?.postCount ?? 0}</strong></li>
                <li><span>댓글</span><strong>{detail.stats?.commentCount ?? 0}</strong></li>
                <li><span>좋아요</span><strong>{detail.stats?.likeCount ?? 0}</strong></li>
                <li><span>팔로워</span><strong>{detail.stats?.followerCount ?? 0}</strong></li>
                <li><span>팔로잉</span><strong>{detail.stats?.followingCount ?? 0}</strong></li>
                <li><span>북마크</span><strong>{detail.stats?.bookmarkCount ?? 0}</strong></li>
              </ul>
            </article>
          </div>

          <section className="admin-panel">
            <h3>관리 액션</h3>
            {isProtected && (
              <p className="admin-note">본인 또는 슈퍼유저 계정은 일부 변경이 제한됩니다.</p>
            )}
            <div className="admin-inline-actions">
              <select
                defaultValue={detail.status}
                disabled={isProtected}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="admin-select"
              >
                {USER_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select
                defaultValue={detail.role}
                disabled={isProtected}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="admin-select"
              >
                {USER_ROLE.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <button type="button" disabled={isProtected} onClick={handleForceLogout} className="admin-btn danger">
                강제 로그아웃
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default AdminUserDetail;

