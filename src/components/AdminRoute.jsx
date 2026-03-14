import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * 어드민 라우트 가드 컴포넌트
 * - 로딩 중: 인증 확인 메시지 표시 (빈 화면 방지)
 * - 미인증: 로그인 페이지로 리다이렉트
 * - ROLE_ADMIN이 아닌 경우: 홈으로 리다이렉트
 */
function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 로딩 중에는 인증 확인 메시지 표시 (null 반환 시 빈 화면이 되므로)
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9rem',
      }}>
        인증 확인 중...
      </div>
    );
  }

  // 미인증 → 로그인 페이지로 이동
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // 관리자가 아닌 경우 → 홈으로 이동
  if (user?.role !== 'ROLE_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;
