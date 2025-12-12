import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from "../components/Gnb";
import Footer from "../components/Footer"
import './Signup.css'

function Signup() {

  const navigate = useNavigate();

  // 폼 데이터를 관리하는 상태입니다.
  // 회원가입에 필요한 모든 필드의 값을 저장합니다.
  const [formData, setFormData] = useState({
    email: '',           // 사용자 이메일 주소
    password: '',        // 사용자 비밀번호
    confirmPassword: '', // 비밀번호 확인 (비밀번호 일치 검증용)
    username: ''         // 사용자 이름
  })

  // 폼 유효성 검사 에러 메시지를 저장하는 상태입니다.
  // 각 필드별로 에러 메시지를 객체(오브젝트) 형태로 저장합니다.
  const [errors, setErrors] = useState({})

  // API 요청 중인지 여부를 나타내는 로딩 상태입니다.
  const [isLoading, setIsLoading] = useState(false)

  /**
   * isValidEmail 함수
   *
   * 이메일 주소가 유효한 형식인지 검사하는 함수입니다.
   *
   * @param {string} email - 검사할 이메일 주소
   * @returns {boolean} - 유효한 이메일 형식이면 true, 아니면 false
   *
   * 검증 로직:
   * 1. @ 기호가 있는지 확인
   * 2. @ 기호가 첫 번째 문자가 아닌지 확인 (앞에 사용자명이 있어야 함)
   * 3. 마지막 . 기호가 @ 기호 뒤에 있는지 확인 (도메인이 있어야 함)
   * 4. 마지막 . 기호가 이메일의 마지막 문자가 아닌지 확인 (최상위 도메인이 있어야 함)
   */
  const isValidEmail = (email) => {
    // @ 기호의 위치 찾기
    const atIndex = email.indexOf('@');
    // 마지막 . 기호의 위치 찾기
    const dotIndex = email.lastIndexOf('.');

    // 유효성 검사: @ 기호가 있고, @ 뒤에 .이 있고, .이 마지막이 아니어야 함
    return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
  };

  /**
   * validateForm 함수
   *
   * 폼의 유효성을 검사하는 함수입니다.
   *
   * @returns {boolean} - 모든 검증을 통과하면 true, 그렇지 않으면 false
   *
   * 검증 규칙:
   * 1. 이메일: 필수 입력, 올바른 이메일 형식
   * 2. 비밀번호: 필수 입력, 최소 8자 이상
   * 3. 비밀번호 확인: 필수 입력, 비밀번호와 일치해야 함
   * 4. 이름: 필수 입력
   */
  const validateForm = () => {
    const newErrors = {}

    // 이메일 검증
    // 1단계: 이메일이 입력되었는지 확인
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.'
    }
    // 2단계: 이메일 형식이 올바른지 확인 (isValidEmail 함수 사용)
    else if (!isValidEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.'
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.'
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }

    // 이름 검증
    if (!formData.username) {
      newErrors.username = '이름을 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * handleSubmit 함수
   *
   * 회원가입 폼을 제출할 때 호출되는 함수입니다.
   *
   * @param {Event} e - 폼 제출 이벤트 객체
   *
   * 처리 과정:
   * 1. 폼 기본 제출 동작 방지
   * 2. 유효성 검사 실행
   * 3. 검사 통과 시 서버에 회원가입 요청
   * 4. 성공 시 홈 페이지로 이동
   * 5. 실패 시 에러 메시지 표시
   */
  const handleSubmit = async (e) => {
    // 폼의 기본 제출 동작 방지 (페이지 새로고침 방지)
    e.preventDefault();

    // 폼 유효성 검사 실행
    if (!validateForm()) {
      return; // 검증 실패 시 함수 종료
    }

    // 로딩 상태 시작
    setIsLoading(true);

    try {
      // axios를 사용하여 서버에 POST 요청 전송
      // '/api/signup' 요청 → proxy를 통해 'http://localhost:9080/signup'으로 전달됨
      const response = await axios.post('/api/signup', {
        email: formData.email,
        password: formData.password,
        username: formData.username
      });

      // 서버 응답 확인
      if (response.data.success) {
        // 회원가입 성공: 성공 메시지 표시
        alert(response.data.message);
        // 홈 페이지로 이동
        navigate('/');
      } else {
        // 회원가입 실패: 에러 메시지 표시 (예: 이미 가입된 이메일)
        alert(response.data.message);
      }
    } catch (error) {
      // 네트워크 에러 또는 서버 에러 처리
      console.error('회원가입 에러:', error);
      alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 로딩 상태 종료 (성공/실패 관계없이 실행)
      setIsLoading(false);
    }
  }

  /**
   * handleChange 함수
   * 
   * 입력 필드의 값이 변경될 때 호출되는 이벤트 핸들러입니다.
   * 
   * @param {Event} e - 입력 필드의 변경 이벤트 객체
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 해당 필드에 에러가 있다면 에러를 초기화합니다.
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  return (
    <>
      <GNB />        
        <div className="signup-container">          
          <div className='signup-card'>
            <h1>회원가입</h1>
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-group">
                <input type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일을 입력하세요"
                  className={errors.email ? 'error' : ''}
                />
              </div>
              <div className="form-group">
                <input type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요 (최소 8자)"
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
              <div className="form-group">
                <input type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
              <div className="form-group">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="이름을 입력하세요"
                  className={errors.username ? 'error' : ''}
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>
              <div className="button-group">
                <button type="submit" className="signup-button" disabled={isLoading}>
                  {isLoading ? '처리 중...' : '회원가입'}
                </button>
              </div>
            </form>
          </div>
        </div>
      <Footer />
    </>
  );

}

export default Signup;
