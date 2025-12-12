import { createContext } from 'react';

/**
 * AuthContext
 *
 * 애플리케이션 전역에서 사용할 인증 상태를 관리하는 Context입니다.
 * 로그인한 사용자 정보와 accessToken을 저장하고 관리합니다.
 */
const AuthContext = createContext(null);

export default AuthContext;
