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
import imgJwt         from '../assets/jwt.png';
import imgKakaoDev    from '../assets/kakao_developer.png';
import imgAxios       from '../assets/axios.png';
import imgNginx       from '../assets/nginx.png';
import imgAmazonLinux from '../assets/Amazon_Linux_Logo_v08_Amazon-Linux-right—full-color-1260x616.png';
import imgPostman     from '../assets/postman.png';

/**
 * 기술 스택 카테고리 데이터
 * BACKEND_TECH_SPEC.md 1.기술 스택 요약 기준
 */
const CATEGORIES = [
  {
    id: 'backend',
    label: 'Back-End',
    dot: '#6ee7b7',
    techs: [
      { name: 'Java',           version: '17 LTS',       img: imgJava },
      { name: 'Spring Boot',    version: '4.0.0',        img: imgSpringBoot },
      { name: 'Spring Security',version: '7.x',          img: imgSpringBoot },
      { name: 'Spring Data JPA',version: '7.x',          img: imgSpringBoot },
      { name: 'JWT',            version: 'jjwt 0.12.5',  img: imgJwt },
      { name: 'Kakao OAuth',    version: 'OAuth2',        img: imgKakaoDev },
    ],
  },
  {
    id: 'frontend',
    label: 'Front-End',
    dot: '#93c5fd',
    techs: [
      { name: 'React',       version: '19',       img: imgReact },
      { name: 'JavaScript',  version: 'ES2024',   img: imgJavaScript },
      { name: 'Axios',       version: 'HTTP',     img: imgAxios },
    ],
  },
  {
    id: 'database',
    label: 'Database',
    dot: '#fcd34d',
    techs: [
      { name: 'MySQL',  version: '8.0',   img: imgMySQL },
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure',
    dot: '#f9a8d4',
    techs: [
      { name: 'Docker',          version: 'Container',    img: imgDocker },
      { name: 'Nginx',           version: 'Proxy',        img: imgNginx },
      { name: 'AWS Lightsail',   version: 'VPS',          img: imgAWS },
      { name: 'Amazon Linux',    version: '2023',         img: imgAmazonLinux },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps / SCM',
    dot: '#c4b5fd',
    techs: [
      { name: 'GitHub Actions', version: 'CI/CD',  img: imgGitHub },
      { name: 'GHCR',           version: 'Registry', emoji: '📦' },
      { name: 'Git',            version: 'SCM',    img: imgGit },
    ],
  },
  {
    id: 'test',
    label: 'Test',
    dot: '#fdba74',
    techs: [
      { name: 'Postman', version: 'API Test', img: imgPostman },
    ],
  },
];

/**
 * CI/CD 파이프라인 단계
 */
const CICD_STEPS = [
  { icon: '💻', label: 'git push' },
  { icon: '⚡', label: 'Actions' },
  { icon: '🏗️', label: 'Build' },
  { icon: '📦', label: 'GHCR' },
  { icon: '🚀', label: 'Deploy' },
];

/**
 * TechTile — 아이콘 중심 기술 타일 컴포넌트
 */
function TechTile({ tech }) {
  return (
    <div className="about-tile">
      {/* 로고 영역 */}
      <div className="about-tile-logo-wrap">
        {tech.img ? (
          <img src={tech.img} alt={tech.name} className="about-tile-logo" />
        ) : (
          <span className="about-tile-emoji">{tech.emoji}</span>
        )}
      </div>

      {/* 이름 */}
      <span className="about-tile-name">{tech.name}</span>

      {/* 버전 배지 */}
      <span className="about-tile-version">{tech.version}</span>
    </div>
  );
}

/**
 * About 페이지 — 기술 스택 아이콘 그리드 뷰
 */
function About() {
  return (
    <>
      <GNB />
      <div className="about-container">

        {/* 배경 장식 오브 */}
        <div className="about-orb about-orb--a" />
        <div className="about-orb about-orb--b" />

        {/* ── 히어로 ── */}
        <header className="about-hero">
          <div className="about-hero-badge">Tech Stack</div>
          <h1 className="about-hero-title">Project Specification</h1>
          <p className="about-hero-sub">
            Java 17 · Spring Boot 4 · React 19 · MySQL 8 · Docker · AWS Lightsail
          </p>
        </header>

        {/* ── 기술 스택 아이콘 그리드 ── */}
        <section className="about-stack-section">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="about-cat">
              {/* 카테고리 헤더 */}
              <div className="about-cat-header">
                <span className="about-cat-dot" style={{ background: cat.dot }} />
                <span className="about-cat-label">{cat.label}</span>
              </div>

              {/* 타일 그리드 */}
              <div className="about-tile-grid">
                {cat.techs.map((tech) => (
                  <TechTile key={tech.name} tech={tech} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── CI/CD 파이프라인 ── */}
        <section className="about-cicd-section">
          <div className="about-section-heading">CI/CD Pipeline</div>
          <div className="about-cicd-flow">
            {CICD_STEPS.map((step, idx) => (
              <div key={idx} className="about-cicd-flow-item">
                <div className="about-cicd-step">
                  <span className="about-cicd-step-icon">{step.icon}</span>
                  <span className="about-cicd-step-label">{step.label}</span>
                </div>
                {idx < CICD_STEPS.length - 1 && (
                  <span className="about-cicd-arrow">›</span>
                )}
              </div>
            ))}
          </div>

          {/* Docker 컨테이너 구성 */}
          <div className="about-docker-net">
            <span className="about-docker-net-label">🐳 Docker prod-network</span>
            <div className="about-docker-boxes">
              <div className="about-docker-box about-docker-box--fe">
                <span className="about-docker-box-name">prod-frontend</span>
                <span className="about-docker-box-stack">Nginx + React</span>
                <span className="about-docker-box-port">:80</span>
              </div>
              <span className="about-docker-conn">⇄</span>
              <div className="about-docker-box about-docker-box--be">
                <span className="about-docker-box-name">prod-backend</span>
                <span className="about-docker-box-stack">Spring Boot</span>
                <span className="about-docker-box-port">:9080</span>
              </div>
              <span className="about-docker-conn">⇄</span>
              <div className="about-docker-box about-docker-box--db">
                <span className="about-docker-box-name">mysql</span>
                <span className="about-docker-box-stack">MySQL 8.0</span>
                <span className="about-docker-box-port">:3306</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 하단 네비게이션 ── */}
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
