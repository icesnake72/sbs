import { useState } from 'react';
import { Link } from 'react-router-dom';
import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import './About.css';

/**
 * API 카탈로그 탭 데이터
 * 각 탭은 도메인별 엔드포인트 목록을 포함합니다.
 */
const API_TABS = [
  {
    id: 'auth',
    label: 'Auth',
    endpoints: [
      { method: 'GET',    path: '/api/health',                  auth: false, desc: '헬스체크' },
      { method: 'POST',   path: '/api/signup',                  auth: false, desc: '회원가입' },
      { method: 'POST',   path: '/api/login',                   auth: false, desc: '로그인' },
      { method: 'POST',   path: '/api/refresh',                 auth: false, desc: 'Access Token 재발급' },
      { method: 'POST',   path: '/api/logout',                  auth: true,  desc: '로그아웃' },
    ],
  },
  {
    id: 'user',
    label: 'User',
    endpoints: [
      { method: 'GET',    path: '/api/user/me',                 auth: true,  desc: '내 계정 정보' },
      { method: 'GET',    path: '/api/user/profile',            auth: true,  desc: '내 프로필 조회' },
      { method: 'PUT',    path: '/api/user/profile',            auth: true,  desc: '프로필 수정' },
      { method: 'POST',   path: '/api/upload/image',            auth: true,  desc: '이미지 업로드' },
    ],
  },
  {
    id: 'post',
    label: 'Post',
    endpoints: [
      { method: 'GET',    path: '/api/posts',                   auth: true,  desc: '게시글 목록' },
      { method: 'GET',    path: '/api/posts/{id}',              auth: true,  desc: '게시글 상세' },
      { method: 'POST',   path: '/api/posts',                   auth: true,  desc: '게시글 작성' },
      { method: 'POST',   path: '/api/posts/with-images',       auth: true,  desc: '이미지 포함 작성' },
      { method: 'PUT',    path: '/api/posts/{id}',              auth: true,  desc: '게시글 수정' },
      { method: 'DELETE', path: '/api/posts/{id}',              auth: true,  desc: '게시글 삭제' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    endpoints: [
      { method: 'POST',   path: '/api/posts/{postId}/comments', auth: true,  desc: '댓글 작성' },
      { method: 'POST',   path: '/api/posts/{postId}/like',     auth: true,  desc: '게시글 좋아요' },
      { method: 'POST',   path: '/api/posts/{postId}/bookmark', auth: true,  desc: '북마크' },
      { method: 'POST',   path: '/api/users/{userId}/follow',   auth: true,  desc: '팔로우' },
      { method: 'GET',    path: '/api/feed/explore',            auth: true,  desc: '탐색 피드' },
      { method: 'GET',    path: '/api/hashtags/trending',       auth: true,  desc: '트렌딩 해시태그' },
    ],
  },
  {
    id: 'dm',
    label: 'DM',
    endpoints: [
      { method: 'POST',   path: '/api/dm/rooms',                        auth: true, desc: '채팅방 생성/조회' },
      { method: 'GET',    path: '/api/dm/rooms',                        auth: true, desc: '채팅방 목록' },
      { method: 'GET',    path: '/api/dm/rooms/{roomId}/messages',      auth: true, desc: '메시지 조회' },
      { method: 'POST',   path: '/api/dm/rooms/{roomId}/messages',      auth: true, desc: '메시지 전송' },
      { method: 'PUT',    path: '/api/dm/rooms/{roomId}/read',          auth: true, desc: '읽음 처리' },
      { method: 'GET',    path: '/api/dm/unread-count',                 auth: true, desc: '안읽음 카운트' },
    ],
  },
];

/**
 * 기술 스택 카드 데이터
 */
const STACK_CARDS = [
  { label: 'Runtime',         value: 'Java 17' },
  { label: 'Framework',       value: 'Spring Boot 4.0.0' },
  { label: 'Security',        value: 'JWT + Security 7.x' },
  { label: 'Database',        value: 'MySQL 8.0' },
  { label: 'API Base',        value: 'http://localhost:9080' },
  { label: 'Token',           value: 'AT 1h / RT 7d' },
  { label: 'Upload',          value: '/api/upload/image' },
  { label: 'Common Response', value: 'ApiResponse<T>' },
];

/**
 * 인증 흐름 단계
 */
const AUTH_FLOW_STEPS = [
  'POST /api/login',
  'AccessToken 저장',
  'API 요청 + Bearer',
  '401 + TOKEN_EXPIRED',
  'POST /api/refresh 후 재시도',
];

/**
 * 환경/배포 체크 항목
 */
const ENV_CHECKS = [
  { item: 'API Base URL',  value: 'VITE_API_BASE_URL 이 Nginx /api 프록시와 일치', status: 'ok',   label: '필수' },
  { item: 'CORS',          value: '백엔드 allowed-origins 에 프론트 도메인 포함',   status: 'ok',   label: '필수' },
  { item: 'Cookie 전달',   value: 'axios withCredentials: true',                    status: 'ok',   label: '필수' },
  { item: 'Logout Path',   value: '/api/logout 호출 시 withCredentials 필수',       status: 'warn', label: '주의' },
  { item: '401 분기',      value: 'TOKEN_EXPIRED 면 refresh 재시도',                status: 'warn', label: '주의' },
  { item: '쿠키 도메인',   value: '백엔드 domain() 미설정 권장 (자동으로 현재 도메인 바인딩)', status: 'warn', label: '주의' },
];

/**
 * HTTP 메서드별 색상 클래스
 */
function MethodBadge({ method }) {
  return (
    <span className={`about-method about-method--${method.toLowerCase()}`}>
      {method}
    </span>
  );
}

/**
 * About 페이지 컴포넌트
 *
 * 백엔드 기술 스펙을 정리한 프로젝트 소개 페이지입니다.
 * - 기술 스택 요약
 * - 인증/토큰 흐름
 * - API 카탈로그 (탭 방식)
 * - 환경/배포 체크리스트
 */
function About() {
  // 현재 선택된 API 탭 ID
  const [activeTab, setActiveTab] = useState('auth');

  // 활성화된 탭의 엔드포인트 목록
  const activeEndpoints = API_TABS.find((t) => t.id === activeTab)?.endpoints ?? [];

  return (
    <>
      <GNB />
      <div className="about-container">

        {/* ── 히어로 헤더 ── */}
        <header className="about-hero">
          <div className="about-hero-content">
            <h1 className="about-hero-title">myauth React 연동 기술 문서</h1>
            <p className="about-hero-desc">
              백엔드 기술 스펙을 프론트엔드 관점에서 재구성한 참고 문서입니다.
            </p>
            <p className="about-hero-desc">대상: React + Nginx + JavaScript</p>
            <div className="about-chips">
              <span className="about-chip">Source: BACKEND_TECH_SPEC</span>
              <span className="about-chip">Updated: 2026-03-10</span>
              <span className="about-chip">Format: React Component</span>
            </div>
          </div>
        </header>

        {/* ── 기술 스택 요약 ── */}
        <section className="about-section">
          <h2 className="about-section-title">기술 스택 요약</h2>
          <p className="about-section-sub">프론트 의사결정에 직접 영향이 큰 백엔드 핵심 스펙</p>
          <div className="about-stack-grid">
            {STACK_CARDS.map((card) => (
              <article key={card.label} className="about-stack-card">
                <div className="about-stack-card-label">{card.label}</div>
                <div className="about-stack-card-value">{card.value}</div>
              </article>
            ))}
          </div>
        </section>

        {/* ── 인증/토큰 흐름 ── */}
        <section className="about-section">
          <h2 className="about-section-title">인증/토큰 흐름</h2>
          <p className="about-section-sub">React 인터셉터, 세션 복구, 401 분기 처리의 기준 흐름</p>

          <div className="about-flow">
            {AUTH_FLOW_STEPS.map((step, idx) => (
              <div key={idx} className="about-flow-item">
                <div className="about-flow-num">{idx + 1}</div>
                <div className="about-flow-text">{step}</div>
                {/* 화살표 (마지막 항목 제외) */}
                {idx < AUTH_FLOW_STEPS.length - 1 && (
                  <div className="about-flow-arrow">→</div>
                )}
              </div>
            ))}
          </div>

          <div className="about-badges">
            <span className="about-badge about-badge--ok">웹: RefreshToken은 HttpOnly 쿠키</span>
            <span className="about-badge about-badge--warn">요청 시 withCredentials 필수</span>
            <span className="about-badge about-badge--err">INVALID_TOKEN 이면 즉시 로그아웃</span>
          </div>

          <pre className="about-code">{`// axios 기본 설정
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true   // HTTP-only 쿠키 자동 전송
});`}</pre>
        </section>

        {/* ── API 카탈로그 ── */}
        <section className="about-section">
          <h2 className="about-section-title">API 카탈로그</h2>
          <p className="about-section-sub">도메인별 엔드포인트 (탭으로 분리)</p>

          {/* 탭 버튼 */}
          <div className="about-tabs">
            {API_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`about-tab ${activeTab === tab.id ? 'about-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 엔드포인트 테이블 */}
          <div className="about-table-wrap">
            <table className="about-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Auth</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {activeEndpoints.map((ep, idx) => (
                  <tr key={idx}>
                    <td><MethodBadge method={ep.method} /></td>
                    <td className="about-table-path">{ep.path}</td>
                    <td>
                      <span className={`about-auth-badge ${ep.auth ? 'about-auth-badge--required' : 'about-auth-badge--none'}`}>
                        {ep.auth ? '필요' : '없음'}
                      </span>
                    </td>
                    <td className="about-table-desc">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 환경/배포 체크 ── */}
        <section className="about-section">
          <h2 className="about-section-title">환경/배포 체크리스트</h2>
          <p className="about-section-sub">React + Nginx 배포 시 빠르게 검증할 항목</p>

          <div className="about-check-list">
            {ENV_CHECKS.map((check) => (
              <div key={check.item} className="about-check-item">
                <div className="about-check-header">
                  <span className="about-check-name">{check.item}</span>
                  <span className={`about-badge about-badge--${check.status}`}>{check.label}</span>
                </div>
                <p className="about-check-value">{check.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── React 연동 코드 샘플 ── */}
        <section className="about-section">
          <h2 className="about-section-title">React 연동 코드 샘플</h2>
          <p className="about-section-sub">바로 복사해 사용할 수 있는 패턴</p>

          <div className="about-sample">
            <div className="about-sample-title">axios 인터셉터 – 401 자동 재시도</div>
            <pre className="about-code">{`api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && !config._retry) {
      config._retry = true;
      try {
        await axios.post('/api/refresh', {}, { withCredentials: true });
        return api(config); // 원래 요청 재시도
      } catch {
        // refreshToken 도 만료 → 로그아웃
      }
    }
    return Promise.reject(error);
  }
);`}</pre>
          </div>

          <div className="about-sample">
            <div className="about-sample-title">이미지 업로드</div>
            <pre className="about-code">{`const formData = new FormData();
formData.append('file', file);

const res = await axios.post('/api/upload/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  withCredentials: true,
});
const imageUrl = res.data.data.imageUrl; // http://서버/uploads/uuid.jpg`}</pre>
          </div>
        </section>

        {/* ── 하단 링크 ── */}
        <div className="about-footer-nav">
          <Link to="/" className="about-back-link">← 홈으로</Link>
          <Link to="/posts" className="about-posts-link">게시글 보기 →</Link>
        </div>

      </div>
      <Footer />
    </>
  );
}

export default About;
