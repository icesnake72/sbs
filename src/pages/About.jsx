import { Link } from 'react-router-dom';
import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import './About.css';

// ── 기술 스택 이미지 임포트 ──
import imgJava        from '../assets/java.png';
import imgSpringBoot  from '../assets/spring_boot.png';
import imgReact       from '../assets/react.png';
import imgJavaScript  from '../assets/javascript.png';
import imgMySQL       from '../assets/mysql.png';
import imgDocker      from '../assets/docker.webp';
import imgAWS         from '../assets/aws_logo.svg.png';
import imgGit         from '../assets/git.png';
import imgGitHub      from '../assets/GitHub-logo.png';

/**
 * 기술 스택 카테고리 데이터
 * 각 카테고리는 여러 기술 항목을 포함합니다.
 */
const TECH_CATEGORIES = [
  {
    id: 'backend',
    title: 'Back-End',
    icon: '⚙️',
    color: '#6ee7b7',    // 초록 계열
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))',
    border: 'rgba(16,185,129,0.3)',
    techs: [
      { name: 'Java 17',           img: imgJava,       desc: 'LTS 버전, Record·Pattern Matching 지원' },
      { name: 'Spring Boot 4.0',   img: imgSpringBoot, desc: 'REST API · 의존성 주입 · 자동 설정' },
      { name: 'Spring Security',   img: imgSpringBoot, desc: 'JWT 인증·인가, OAuth2 카카오 소셜 로그인' },
    ],
  },
  {
    id: 'frontend',
    title: 'Front-End',
    icon: '🎨',
    color: '#93c5fd',    // 파랑 계열
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.1))',
    border: 'rgba(59,130,246,0.3)',
    techs: [
      { name: 'React 19',          img: imgReact,      desc: 'SPA · Hooks · Context API · React Router' },
      { name: 'JavaScript ES2024', img: imgJavaScript, desc: 'Vite 빌드 · 모듈 번들링 · HMR 개발 환경' },
    ],
  },
  {
    id: 'database',
    title: 'Database',
    icon: '🗄️',
    color: '#fbbf24',    // 노랑 계열
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
    border: 'rgba(245,158,11,0.3)',
    techs: [
      { name: 'MySQL 8.0',         img: imgMySQL,      desc: 'InnoDB · 관계형 데이터 모델 · JPA/Hibernate' },
    ],
  },
  {
    id: 'infra',
    title: 'Infrastructure',
    icon: '☁️',
    color: '#f9a8d4',    // 분홍 계열
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(219,39,119,0.1))',
    border: 'rgba(236,72,153,0.3)',
    techs: [
      { name: 'AWS Lightsail',     img: imgAWS,        desc: 'VPS 인스턴스 · 고정 IP · 프로덕션 서버' },
      { name: 'Docker',            img: imgDocker,     desc: '컨테이너 빌드·배포 · docker-compose 멀티 서비스' },
    ],
  },
  {
    id: 'devops',
    title: 'DevOps / SCM',
    icon: '🔄',
    color: '#c4b5fd',    // 보라 계열
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))',
    border: 'rgba(139,92,246,0.3)',
    techs: [
      { name: 'GitHub Actions',    img: imgGitHub,     desc: 'push → 빌드 → Docker 이미지 → Lightsail 자동 배포' },
      { name: 'Git / GitHub',      img: imgGit,        desc: '소스코드 버전 관리 · 브랜치 전략 · 코드 리뷰' },
    ],
  },
];

/**
 * CI/CD 파이프라인 단계
 */
const CICD_STEPS = [
  { icon: '💻', label: 'git push',      sub: 'main 브랜치' },
  { icon: '⚡', label: 'GitHub Actions', sub: '워크플로우 트리거' },
  { icon: '🏗️', label: 'Docker Build',  sub: 'React + Nginx 이미지' },
  { icon: '📦', label: 'GHCR Push',     sub: 'ghcr.io 이미지 등록' },
  { icon: '🚀', label: 'Lightsail 배포', sub: 'docker compose up' },
];

/**
 * 아키텍처 구성 요소
 */
const ARCH_ITEMS = [
  { layer: '브라우저', desc: 'HTTP :80', color: 'rgba(59,130,246,0.3)' },
  { layer: 'Nginx',   desc: '리버스 프록시 · SPA 라우팅 · 정적 파일 서빙', color: 'rgba(16,185,129,0.3)' },
  { layer: 'React',   desc: 'SPA · JWT 메모리 저장 · axios 인터셉터', color: 'rgba(139,92,246,0.3)' },
  { layer: 'Spring Boot', desc: 'REST API :9080 · Spring Security · JPA', color: 'rgba(245,158,11,0.3)' },
  { layer: 'MySQL',   desc: 'Docker 컨테이너 :3306 · prod-network 연결', color: 'rgba(236,72,153,0.3)' },
];

/**
 * TechCard 컴포넌트 — 개별 기술 카드
 */
function TechCard({ tech }) {
  return (
    <div className="about-tech-card">
      <div className="about-tech-card-img-wrap">
        <img src={tech.img} alt={tech.name} className="about-tech-card-img" />
      </div>
      <div className="about-tech-card-info">
        <div className="about-tech-card-name">{tech.name}</div>
        <div className="about-tech-card-desc">{tech.desc}</div>
      </div>
    </div>
  );
}

/**
 * About 페이지 — 프로젝트 기술 스펙 비주얼 소개
 */
function About() {
  return (
    <>
      <GNB />
      <div className="about-container">

        {/* ── 히어로 ── */}
        <header className="about-hero">
          <div className="about-hero-badge">Tech Stack</div>
          <h1 className="about-hero-title">Project Specification</h1>
          <p className="about-hero-sub">
            풀스택 소셜 플랫폼 · Java 17 + Spring Boot · React · AWS Lightsail · Docker · CI/CD
          </p>
          <div className="about-hero-tags">
            <span className="about-hero-tag">Java 17</span>
            <span className="about-hero-tag">Spring Boot 4</span>
            <span className="about-hero-tag">React 19</span>
            <span className="about-hero-tag">MySQL 8</span>
            <span className="about-hero-tag">Docker</span>
            <span className="about-hero-tag">AWS</span>
            <span className="about-hero-tag">GitHub Actions</span>
          </div>
        </header>

        {/* ── 기술 스택 카테고리 ── */}
        {TECH_CATEGORIES.map((cat) => (
          <section
            key={cat.id}
            className="about-cat-section"
            style={{ background: cat.gradient, borderColor: cat.border }}
          >
            {/* 카테고리 헤더 */}
            <div className="about-cat-header">
              <span className="about-cat-icon">{cat.icon}</span>
              <h2 className="about-cat-title" style={{ color: cat.color }}>{cat.title}</h2>
            </div>

            {/* 기술 카드 목록 */}
            <div className="about-tech-list">
              {cat.techs.map((tech) => (
                <TechCard key={tech.name} tech={tech} />
              ))}
            </div>
          </section>
        ))}

        {/* ── 시스템 아키텍처 ── */}
        <section className="about-section">
          <h2 className="about-section-title">🏛️ 시스템 아키텍처</h2>
          <p className="about-section-sub">요청이 브라우저에서 DB까지 흐르는 구조</p>
          <div className="about-arch">
            {ARCH_ITEMS.map((item, idx) => (
              <div key={idx} className="about-arch-row">
                <div
                  className="about-arch-layer"
                  style={{ background: item.color, borderColor: item.color.replace('0.3', '0.5') }}
                >
                  <span className="about-arch-layer-name">{item.layer}</span>
                  <span className="about-arch-layer-desc">{item.desc}</span>
                </div>
                {idx < ARCH_ITEMS.length - 1 && (
                  <div className="about-arch-arrow">↓</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CI/CD 파이프라인 ── */}
        <section className="about-section">
          <h2 className="about-section-title">🚀 CI/CD 파이프라인</h2>
          <p className="about-section-sub">GitHub Actions 기반 자동 빌드·배포 흐름</p>
          <div className="about-cicd">
            {CICD_STEPS.map((step, idx) => (
              <div key={idx} className="about-cicd-item">
                <div className="about-cicd-icon">{step.icon}</div>
                <div className="about-cicd-label">{step.label}</div>
                <div className="about-cicd-sub">{step.sub}</div>
                {idx < CICD_STEPS.length - 1 && (
                  <div className="about-cicd-arrow">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Docker 네트워크 구성 */}
          <div className="about-docker-net">
            <div className="about-docker-net-title">
              <img src={imgDocker} alt="Docker" className="about-docker-net-logo" />
              Docker prod-network 구성
            </div>
            <div className="about-docker-net-grid">
              <div className="about-docker-net-box about-docker-net-box--nginx">
                <div className="about-docker-net-name">prod-frontend</div>
                <div className="about-docker-net-tech">Nginx + React</div>
                <div className="about-docker-net-port">:80</div>
              </div>
              <div className="about-docker-net-conn">←→</div>
              <div className="about-docker-net-box about-docker-net-box--spring">
                <div className="about-docker-net-name">prod-backend</div>
                <div className="about-docker-net-tech">Spring Boot</div>
                <div className="about-docker-net-port">:9080</div>
              </div>
              <div className="about-docker-net-conn">←→</div>
              <div className="about-docker-net-box about-docker-net-box--db">
                <div className="about-docker-net-name">mysql</div>
                <div className="about-docker-net-tech">MySQL 8.0</div>
                <div className="about-docker-net-port">:3306</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 주요 기능 ── */}
        <section className="about-section">
          <h2 className="about-section-title">✨ 구현 기능</h2>
          <p className="about-section-sub">현재 서비스에서 제공하는 기능 목록</p>
          <div className="about-features">
            {[
              { icon: '🔐', title: '인증',       items: ['이메일/비번 로그인', '카카오 소셜 로그인', 'JWT Access + Refresh Token', 'HTTP-only 쿠키 보안'] },
              { icon: '👤', title: '프로필',     items: ['프로필 이미지 업로드', '소개글 수정', '팔로우/팔로워', '프로필 조회'] },
              { icon: '📝', title: '게시글',     items: ['텍스트 + 다중 이미지', '공개 범위 설정', '피드 목록 조회', '게시글 상세/삭제'] },
              { icon: '🔧', title: '인프라',     items: ['Docker 컨테이너화', 'Nginx 리버스 프록시', 'GitHub Actions CI/CD', 'AWS Lightsail 배포'] },
            ].map((feat) => (
              <div key={feat.title} className="about-feature-card">
                <div className="about-feature-card-header">
                  <span className="about-feature-icon">{feat.icon}</span>
                  <span className="about-feature-title">{feat.title}</span>
                </div>
                <ul className="about-feature-list">
                  {feat.items.map((item) => (
                    <li key={item} className="about-feature-item">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
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
