import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../services/adminApi';
import {
  extractErrorMessage, formatDate, RoleBadge,
  shortText, StatusBadge, VisibilityBadge,
} from './adminUtils';

// ── 통계 카드 정의 ──
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

// ── 차트 라인 색상 정의 ──
const CHART_COLORS = {
  newUsers:     '#22c55e',  // 초록: 가입자
  newPosts:     '#3b82f6',  // 파랑: 게시글
  newComments:  '#a78bfa',  // 보라: 댓글
  totalViews:   '#f59e0b',  // 노랑: 조회수
};

// ── 차트 기간 옵션 ──
const PERIOD_OPTIONS = [
  { value: 7,  label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
];

// ── 차트 커스텀 Tooltip ──
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(22,22,30,0.95)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      padding: '0.6rem 0.8rem',
      fontSize: '0.78rem',
      lineHeight: 1.6,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: {entry.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

function AdminDashboard() {
  const { accessToken } = useAuth();

  // ── 통계 카드 데이터 ──
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ── 차트 데이터 ──
  const [dailyStats, setDailyStats] = useState([]);
  const [chartDays, setChartDays] = useState(14);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');

  // ── 통계 카드 + 최근 데이터 로드 ──
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

  // ── 날짜별 차트 데이터 로드 ──
  useEffect(() => {
    if (!accessToken) return;
    const fetchDailyStats = async () => {
      setChartLoading(true);
      setChartError('');
      try {
        const data = await adminApi.getDailyStats(accessToken, chartDays);
        // 날짜순 정렬 (오래된 순서)
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.date.localeCompare(b.date))
          : [];
        // 날짜 포맷을 MM/DD로 변환
        const formatted = sorted.map((item) => ({
          ...item,
          dateLabel: item.date?.substring(5) || item.date, // "2026-03-15" → "03-15"
        }));
        setDailyStats(formatted);
      } catch (err) {
        // API가 아직 없으면 에러 무시 (빈 차트 표시)
        console.warn('daily-stats API 호출 실패:', err?.response?.status || err.message);
        setChartError('일별 통계 API가 아직 준비되지 않았습니다.');
        setDailyStats([]);
      } finally {
        setChartLoading(false);
      }
    };
    fetchDailyStats();
  }, [accessToken, chartDays]);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h2>📊 대시보드</h2>
      </header>

      {error && <p className="admin-error">{error}</p>}

      {/* ── 통계 카드 ── */}
      <div className="admin-stat-grid">
        {STAT_DEFS.map(({ key, label, icon }) => (
          <article key={key} className="admin-stat-card">
            <div className="admin-stat-icon">{icon}</div>
            <p className="admin-stat-label">{label}</p>
            <strong className="admin-stat-value">
              {isLoading ? '-' : (stats?.[key] ?? 0).toLocaleString()}
            </strong>
          </article>
        ))}
      </div>

      {/* ── 일별 트렌드 차트 ── */}
      <section className="admin-panel" style={{ marginBottom: '12px' }}>
        <div className="admin-panel-head">
          <h3>📈 일별 트렌드</h3>
          {/* 기간 선택 버튼 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`admin-page-btn ${chartDays === value ? 'active' : ''}`}
                onClick={() => setChartDays(value)}
                style={{ minWidth: '42px', height: '28px', fontSize: '0.75rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 차트 에러 메시지 */}
        {chartError && (
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem',
            textAlign: 'center',
            padding: '2rem 0',
          }}>
            {chartError}
          </p>
        )}

        {/* 차트 로딩 */}
        {chartLoading && !chartError && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>
            차트 로딩 중...
          </p>
        )}

        {/* 차트 렌더링 */}
        {!chartLoading && !chartError && dailyStats.length > 0 && (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  {/* 그라데이션 정의 */}
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.newUsers} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.newUsers} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.newPosts} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.newPosts} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.newComments} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.newComments} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.totalViews} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.totalViews} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* 그리드 */}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

                {/* X축: 날짜 */}
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />

                {/* Y축 */}
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* 커스텀 Tooltip */}
                <Tooltip content={<ChartTooltip />} />

                {/* 범례 */}
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}
                />

                {/* 데이터 영역: 가입자 */}
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  name="가입자"
                  stroke={CHART_COLORS.newUsers}
                  fill="url(#gradUsers)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                {/* 데이터 영역: 게시글 */}
                <Area
                  type="monotone"
                  dataKey="newPosts"
                  name="게시글"
                  stroke={CHART_COLORS.newPosts}
                  fill="url(#gradPosts)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                {/* 데이터 영역: 댓글 */}
                <Area
                  type="monotone"
                  dataKey="newComments"
                  name="댓글"
                  stroke={CHART_COLORS.newComments}
                  fill="url(#gradComments)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                {/* 데이터 영역: 조회수 */}
                <Area
                  type="monotone"
                  dataKey="totalViews"
                  name="조회수"
                  stroke={CHART_COLORS.totalViews}
                  fill="url(#gradViews)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 데이터 없음 */}
        {!chartLoading && !chartError && dailyStats.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>
            표시할 데이터가 없습니다.
          </p>
        )}
      </section>

      {/* ── 최근 가입 사용자 / 최근 게시글 ── */}
      <div className="admin-section-grid">
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
                      <td><Link to={`/admin/users/${user.id}`}>{user.name}</Link></td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{user.email}</td>
                      <td><RoleBadge role={user.role} /></td>
                      <td><StatusBadge status={user.status} /></td>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

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
                      <td style={{ fontSize: '0.8rem' }}>{post.author?.name || '-'}</td>
                      <td><Link to={`/admin/posts/${post.id}`}>{shortText(post.content, 35)}</Link></td>
                      <td><VisibilityBadge visibility={post.visibility} /></td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{post.likeCount ?? 0}</td>
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
