import { Link } from 'react-router-dom';
import Footer from "../components/Footer";
import GNB from "../components/Gnb";
import './Home.css';

function Home() {
  return (
    <>
      <GNB />
      <div className="home-container">
        <h1 className="home-title">My Work</h1>
        <p className="home-desc">백엔드 + React 풀스택 프로젝트입니다.</p>
        <div className="home-links">
          <Link to="/posts" className="home-link home-link--primary">
            게시글 보기
          </Link>
          <Link to="/about" className="home-link home-link--secondary">
            About This Project
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Home;
