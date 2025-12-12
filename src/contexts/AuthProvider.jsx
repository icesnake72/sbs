import { useState, useEffect } from 'react';
import AuthContext from './AuthContext';

/**
 * AuthProvider 컴포넌트
 *
 * 인증 상태를 관리하고 하위 컴포넌트들에게 인증 정보를 제공합니다.
 *
 * @param {Object} props - 컴포넌트 props
 * @param {ReactNode} props.children - 하위 컴포넌트들
 */
export function AuthProvider({ children }) {
  // 사용자 정보를 저장하는 상태
  // user 객체: { id, email, name, role }
  const [user, setUser] = useState(null);

  // accessToken을 저장하는 상태
  // JWT 토큰 문자열
  const [accessToken, setAccessToken] = useState(null);

  // 로딩 상태 (초기 로드 시 localStorage에서 데이터를 불러오는 동안)
  const [isLoading, setIsLoading] = useState(true);

  /**
   * useEffect: 컴포넌트 마운트 시 localStorage에서 저장된 인증 정보 복원
   *
   * 브라우저를 새로고침해도 로그인 상태가 유지되도록
   * localStorage에 저장된 사용자 정보와 토큰을 불러옵니다.
   */
  useEffect(() => {
    // localStorage에서 저장된 사용자 정보 가져오기
    const savedUser = localStorage.getItem('user');
    // localStorage에서 저장된 accessToken 가져오기
    const savedToken = localStorage.getItem('accessToken');

    // 저장된 정보가 있으면 상태에 복원
    if (savedUser && savedToken) {
      try {
        // JSON 문자열을 객체로 파싱
        setUser(JSON.parse(savedUser));
        setAccessToken(savedToken);
      } catch (error) {
        // 파싱 에러 발생 시 localStorage 정리
        console.error('localStorage 데이터 파싱 에러:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
      }
    }

    // 로딩 완료
    setIsLoading(false);
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  /**
   * login 함수
   *
   * 로그인 성공 시 호출되는 함수입니다.
   * 서버로부터 받은 사용자 정보와 토큰을 저장합니다.
   *
   * @param {Object} userData - 서버로부터 받은 사용자 정보
   * @param {string} token - accessToken
   */
  const login = (userData, token) => {
    // 상태 업데이트
    setUser(userData);
    setAccessToken(token);

    // localStorage에 저장 (브라우저 새로고침 시에도 유지되도록)
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', token);
  };

  /**
   * logout 함수
   *
   * 로그아웃 시 호출되는 함수입니다.
   * 저장된 모든 인증 정보를 삭제합니다.
   */
  const logout = () => {
    // 상태 초기화
    setUser(null);
    setAccessToken(null);

    // localStorage 정리
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  };

  /**
   * updateToken 함수
   *
   * accessToken을 갱신하는 함수입니다.
   * 토큰 갱신 API 호출 후 새로운 토큰을 저장할 때 사용합니다.
   *
   * @param {string} newToken - 새로운 accessToken
   */
  const updateToken = (newToken) => {
    setAccessToken(newToken);
    localStorage.setItem('accessToken', newToken);
  };

  // Context에 제공할 값
  // 하위 컴포넌트들은 이 값들을 useAuth() 훅을 통해 사용할 수 있습니다.
  const value = {
    user,           // 현재 로그인한 사용자 정보
    accessToken,    // 현재 accessToken
    isLoading,      // 로딩 상태
    login,          // 로그인 함수
    logout,         // 로그아웃 함수
    updateToken,    // 토큰 갱신 함수
    isAuthenticated: !!user  // 로그인 여부 (user가 있으면 true)
  };

  // 로딩 중일 때는 아무것도 렌더링하지 않음 (또는 로딩 스피너 표시 가능)
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
