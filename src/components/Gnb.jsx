import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Gnb.css';

function GNB() {
  const navigate = useNavigate();
  // AuthContext에서 인증 정보 가져오기
  const { user, isAuthenticated, logout } = useAuth();

  /**
   * handleLogout 함수
   *
   * 로그아웃 버튼 클릭 시 호출되는 함수입니다.
   * AuthContext의 logout 함수를 호출하여 로그인 정보를 삭제하고 홈으로 이동합니다.
   */
  const handleLogout = () => {
    // 로그아웃 확인
    if (window.confirm('로그아웃 하시겠습니까?')) {
      // AuthContext의 logout 함수 호출 (localStorage와 상태 정리)
      logout();
      // 홈 페이지로 이동
      navigate('/');
    }
  };

  return (
    <>
      <nav className="gnb">
        <div className="gnb-container">
          {/* 왼쪽 영역: 네비게이션 링크 */}
          <div className="gnb-left">
            <Link to="/" className={`gnb-link ${location.pathname === '/home' ? 'active' : ''}`}>
              HOME
            </Link>
          </div>

          {/* 오른쪽 영역: 로그인 상태에 따라 다른 UI 표시 */}
          <div className="gnb-right">
            {isAuthenticated ? (
              // 로그인된 상태: 사용자 이름과 로그아웃 버튼 표시
              <>
                <span className="gnb-user-info">
                  {user?.name}님
                </span>
                <button onClick={handleLogout} className="auth-link logout-button">
                  로그아웃
                </button>
              </>
            ) : (
              // 로그인되지 않은 상태: 로그인/회원가입 버튼 표시
              <>
                <Link to="/login" className="auth-link">
                  로그인
                </Link>
                <Link to="/signup" className="auth-link signup">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

export default GNB;