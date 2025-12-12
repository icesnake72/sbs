import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

/**
 * useAuth 커스텀 훅
 *
 * 컴포넌트에서 인증 정보를 사용하기 위한 훅입니다.
 *
 * 사용 예시:
 * const { user, login, logout, isAuthenticated } = useAuth();
 *
 * @returns {Object} 인증 관련 상태와 함수들
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // Context 외부에서 사용하려고 하면 에러 발생
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
}
