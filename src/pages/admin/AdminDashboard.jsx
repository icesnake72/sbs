import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDate, formatDateTime, RoleBadge, shortText, StatusBadge, VisibilityBadge } from './adminUtils';

// ── 통계 카드 정의: key(API 응답 필드명), label(표시명), icon(이모지 아이콘) ──
const STAT_DEFS = [
  { key: 'totalUsers',    label: '전체 사용자', icon: '👥' },
  { key: 'activeUsers',   label: '활성 사용자', icon: '🟢' },
  { key: 'suspendedUsers',label: '정지 사용자', icon: '🔴' },
  { key: 'totalPosts',    label: '전체 게시글', icon: '📝' },
  { key: 'totalComments', label: '전체 댓글',  icon: '💬' },
  { key: 'totalDmRooms',  label: 'DM 채팅방',  icon: '✉️' },
  { key: 'todayNewUsers', label: '오늘 가입',   icon: '🆕' },
  { key: 'todayNewPosts', label: '오늘 게시글', icon: '📅' },
  { key: 'weeklyNewUsers',label: '주간 가입',   icon: '📈' },
  { key: 'weeklyNewPosts',label: '주간 게시글', icon: '📊' },
];

function AdminDashboard() {
  const { accessToken } = useAuth();
  // 통계 데이터 상태
  const [stats, setStats] = useState(null);
  // 최근 가입 사용자 목록 상태
  const [recentUsers, setRecentUsers] = useState([]);
  // 최근 게시글 목록 상태
  const [recentPosts, setRecentPosts] = useState([]);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 에러 메시지 상태
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    // 대시보드 데이터 병렬 로딩
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        // 통계, 최근 사용자, 최근 게시글을 병렬로 요청
        const [statsData, usersData, postsData] = await Promise.all([
          adminApi.getDashboardStats(accessToken),
          adminApi.getRecentUsers(accessToken, 10),
          adminApi.getRecentPosts(accessToken, 10),
        ]);
        setStats(statsData || {});
        setRecentUsers(Array.isArray(usersData) ? usersData : []);
        setRecentPosts(Array.isArray(postsData) ? postsData : []);
      } catch (err) {
        setError(extractErrorMessage(err, '대시보드 정보를 불러오지 못했습니다.'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [accessToken]);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>📊 대시보드</h2>
      </header>

      {/* 에러 메시지 표시 */}
      {error && <p className="admin-error">{error}</p>}

      {/* 통계 카드 10개 그리드 */}
      <div className="admin-stat-grid">
        {STAT_DEFS.map(({ key, label, icon }) => (
          <article key={key} className="admin-stat-card">
            {/* 통계 카드 아이콘 */}
            <div className="admin-stat-icon">{icon}</div>
            {/* 통계 카드 라벨 */}
            <p className="admin-stat-label">{label}</p>
            {/* 통계 카드 값: 로딩 중이면 '-', 아니면 천 단위 구분자 포함 숫자 */}
            <strong className="admin-stat-value">
              {isLoading ? '-' : (stats?.[key] ?? 0).toLocaleString()}
            </strong>
          </article>
        ))}
      </div>

      {/* 최근 가입 사용자 / 최근 게시글 2열 그리드 */}
      <div className="admin-section-grid">
        {/* 최근 가입 사용자 패널 */}
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>🆕 최근 가입 사용자</h3>
            <Link to="/admin/users">전체 보기</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" className="admin-empty-cell">로딩 중...</td></tr>
                ) : recentUsers.length === 0 ? (
                  <tr><td colSpan="5" className="admin-empty-cell">데이터가 없습니다.</td></tr>
                ) : (
                  recentUsers.map((user) => (
                    <tr key={user.id}>
                      {/* 사용자 이름 클릭 시 상세 페이지 이동 */}
                      <td>
                        <Link to={`/admin/users/${user.id}`}>{user.name}</Link>
                      </td>
                      {/* 이메일 (작게 표시) */}
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{user.email}</td>
                      {/* 역할 배지 */}
                      <td><RoleBadge role={user.role} /></td>
                      {/* 상태 배지 */}
                      <td><StatusBadge status={user.status} /></td>
                      {/* 가입일 (날짜만 표시) */}
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 최근 게시글 패널 */}
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>📝 최근 게시글</h3>
            <Link to="/admin/posts">전체 보기</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>작성자</th>
                  <th>내용</th>
                  <th>공개</th>
                  <th>♥</th>
                  <th>작성일</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" className="admin-empty-cell">로딩 중...</td></tr>
                ) : recentPosts.length === 0 ? (
                  <tr><td colSpan="5" className="admin-empty-cell">데이터가 없습니다.</td></tr>
                ) : (
                  recentPosts.map((post) => (
                    <tr key={post.id}>
                      {/* 작성자 이름 (작게 표시) */}
                      <td style={{ fontSize: '0.8rem' }}>{post.author?.name || '-'}</td>
                      {/* 게시글 내용 미리보기 (35자 제한, 클릭 시 상세 이동) */}
                      <td>
                        <Link to={`/admin/posts/${post.id}`}>{shortText(post.content, 35)}</Link>
                      </td>
                      {/* 공개범위 배지 */}
                      <td><VisibilityBadge visibility={post.visibility} /></td>
                      {/* 좋아요 수 */}
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{post.likeCount ?? 0}</td>
                      {/* 작성일 */}
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(post.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export default AdminDashboard;
