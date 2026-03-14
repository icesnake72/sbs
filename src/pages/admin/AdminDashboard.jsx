import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import { extractErrorMessage, formatDateTime, shortText } from './adminUtils';

function AdminDashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
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

  const statCards = [
    ['전체 사용자', stats?.totalUsers],
    ['활성 사용자', stats?.activeUsers],
    ['정지 사용자', stats?.suspendedUsers],
    ['전체 게시글', stats?.totalPosts],
    ['전체 댓글', stats?.totalComments],
    ['DM 채팅방', stats?.totalDmRooms],
    ['오늘 가입', stats?.todayNewUsers],
    ['오늘 게시글', stats?.todayNewPosts],
    ['주간 가입', stats?.weeklyNewUsers],
    ['주간 게시글', stats?.weeklyNewPosts],
  ];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>어드민 대시보드</h2>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-stat-grid">
        {statCards.map(([label, value]) => (
          <article key={label} className="admin-stat-card">
            <p className="admin-stat-label">{label}</p>
            <strong className="admin-stat-value">{isLoading ? '-' : value ?? 0}</strong>
          </article>
        ))}
      </div>

      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>최근 가입 사용자</h3>
            <Link to="/admin/users">전체 보기</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr><td colSpan="4" className="admin-empty-cell">데이터가 없습니다.</td></tr>
                ) : (
                  recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email}</td>
                      <td>{user.name}</td>
                      <td>{formatDateTime(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>최근 게시글</h3>
            <Link to="/admin/posts">전체 보기</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>작성자</th>
                  <th>내용</th>
                  <th>작성일</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.length === 0 ? (
                  <tr><td colSpan="4" className="admin-empty-cell">데이터가 없습니다.</td></tr>
                ) : (
                  recentPosts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.id}</td>
                      <td>{post.author?.name || '-'}</td>
                      <td>{shortText(post.content, 40)}</td>
                      <td>{formatDateTime(post.createdAt)}</td>
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

