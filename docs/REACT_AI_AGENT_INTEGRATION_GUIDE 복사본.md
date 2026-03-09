# React 프론트엔드 연동 개발 가이드 (AI Agent 실행용)

## 1. 목적
이 문서는 `myauth` 백엔드(Spring Boot)와 React 프론트엔드를 안정적으로 연동하기 위한 실행 가이드다.
목표는 코딩 AI 에이전트가 이 문서만 읽고도 다음을 스스로 구현하는 것이다.

- 인증/토큰 흐름 구현
- 공통 API 클라이언트 구현
- 도메인별 API 연동
- 에러 처리/리프레시 재시도/로그아웃 처리

## 2. 백엔드 핵심 사실 (코드 기준)

- Base URL: `http://localhost:9080`
- 공통 응답 포맷: `ApiResponse<T>`
  - 성공: `{ success: true, message: string, data: T }`
  - 실패: `{ success: false, message: string, data: null }`
- 인증 방식
  - Access Token: `Authorization: Bearer <token>` 헤더
  - Refresh Token: 웹에서는 `HttpOnly` 쿠키(`refreshToken`)
- Refresh 엔드포인트: `POST /api/refresh`
  - 웹: 쿠키 기반 (body 없이 가능)
  - 모바일: body `{ refreshToken }`
- 로그아웃 엔드포인트: `POST /logout` (주의: `/api/logout` 아님)
- CORS/쿠키
  - 개발 profile에서 `localhost:5173` 허용, credentials 허용
  - 프론트 요청은 반드시 `withCredentials: true`(axios) 또는 `credentials: 'include'`(fetch) 사용

## 3. 인증 예외 규약
JWT 필터에서 401 시 일반 `ApiResponse`가 아니라 아래 형식이 올 수 있다.

```json
{
  "errorCode": "TOKEN_EXPIRED",
  "message": "Access Token이 만료되었습니다. 토큰을 갱신해주세요.",
  "action": "REFRESH_TOKEN",
  "path": "/api/user/me"
}
```

처리 규칙:

- `errorCode === 'TOKEN_EXPIRED'` 또는 `action === 'REFRESH_TOKEN'` -> `POST /api/refresh` 후 원요청 1회 재시도
- `errorCode === 'INVALID_TOKEN'` 또는 `action === 'LOGIN_REQUIRED'` -> 즉시 로그아웃 처리(로컬 토큰 제거, 로그인 페이지 이동)

## 4. 보안 설정으로 인한 실제 접근 제약
`SecurityConfig` 기준 permitAll 경로는 제한적이다.
즉, 아래 경로를 제외하면 기본적으로 인증 필요다.

- `/api/health`, `/api/signup`, `/api/login`, `/api/refresh`
- `/api/auth/kakao/**`
- `/uploads/**`

중요: 컨트롤러 주석에 "비로그인 접근 가능"이라고 써 있어도(SecurityConfig에서 별도 허용 안 했으면) 실제로는 인증이 필요하다.
대표적으로 `/api/feed/explore`, `/api/feed/popular`, `/api/hashtags/*`도 현재 설정상 토큰 필요.

## 5. React 구현 표준 (권장)

### 5.1 폴더 구조

```text
src/
  api/
    client.ts
    auth.ts
    posts.ts
    comments.ts
    likes.ts
    follows.ts
    bookmarks.ts
    feed.ts
    hashtags.ts
    dm.ts
    upload.ts
    types.ts
  features/
    auth/
    post/
    dm/
  store/
    authStore.ts
  pages/
```

### 5.2 토큰 저장 전략

- Access Token: 메모리(store) + 새로고침 복구용으로 `localStorage` 선택적 저장
- Refresh Token: 저장 금지(서버 HttpOnly 쿠키)
- 앱 시작 시:
  1. 저장된 accessToken 있으면 복원
  2. 없으면 `POST /api/refresh` 시도
  3. 성공 시 accessToken 저장, 실패 시 비로그인 상태

### 5.3 Axios 클라이언트 필수 설정

- `baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9080'`
- `withCredentials = true`
- request interceptor: accessToken 자동 주입
- response interceptor: 401 + `TOKEN_EXPIRED` 시 refresh 후 재시도(동시 요청 큐잉)

## 6. 공통 타입 정의 (TypeScript)

```ts
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type JwtErrorResponse = {
  errorCode: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'NO_TOKEN';
  message: string;
  action: 'REFRESH_TOKEN' | 'LOGIN_REQUIRED';
  path: string;
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};
```

## 7. API 계약 요약 (우선 구현 대상)

### 7.1 Auth

- `POST /api/signup`
  - body: `{ email, password, username }`
- `POST /api/login`
  - body: `{ email, password }`
  - 웹 응답: `data.accessToken`, `data.refreshToken`는 `null` 가능(쿠키로 처리)
- `POST /api/refresh`
  - 웹: body 없이 호출 가능
  - 응답: `{ accessToken, refreshToken:null }`
- `POST /logout`
  - access token 헤더 포함 권장
  - 서버가 refresh cookie 제거
- `GET /api/user/me`

### 7.2 User/Profile

- `GET /api/user/profile`
- `PUT /api/user/profile`
  - body: `{ name, profileImage, lastName, firstName, phoneNumber, country, address1, address2, birth, bgImage }`

### 7.3 Post

- `POST /api/posts` (JSON)
- `POST /api/posts/with-images` (multipart)
  - part `post`: JSON Blob (`content`, `visibility`)
  - part `images`: File[]
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `GET /api/posts/{id}`
- `GET /api/posts?page=0&size=10`
- `GET /api/posts/me?page=0&size=10`
- `GET /api/posts/user/{userId}?page=0&size=10`

### 7.4 Comment/Like/Bookmark/Follow

- 댓글
  - `POST /api/posts/{postId}/comments`
  - `POST /api/comments/{commentId}/replies`
  - `PUT /api/comments/{id}`
  - `DELETE /api/comments/{id}`
  - `GET /api/posts/{postId}/comments?page=0&size=20`
  - `GET /api/comments/{commentId}/replies`
- 좋아요
  - `POST|DELETE /api/posts/{postId}/like`
  - `POST|DELETE /api/comments/{commentId}/like`
- 북마크
  - `POST|DELETE /api/posts/{postId}/bookmark`
  - `GET /api/me/bookmarks`
- 팔로우
  - `POST|DELETE /api/users/{userId}/follow`
  - `GET /api/users/{userId}/followers`
  - `GET /api/users/{userId}/followings`
  - `GET /api/users/{userId}/follow/count`
  - `GET /api/users/{userId}/follow/check`

### 7.5 Feed/Hashtag

- Feed
  - `GET /api/feed`
  - `GET /api/feed/explore`
  - `GET /api/feed/popular`
  - `GET /api/feed/views`
  - `GET /api/feed/recommended`
- Hashtag
  - `GET /api/hashtags/trending`
  - `GET /api/hashtags/trending/top`
  - `GET /api/hashtags/search?keyword=...`
  - `GET /api/hashtags/{name}`
  - `GET /api/hashtags/{name}/posts`

### 7.6 DM

- `POST /api/dm/rooms` body `{ targetUserId }`
- `GET /api/dm/rooms`
- `GET /api/dm/rooms/{roomId}/messages?page=0&size=50`
- `POST /api/dm/rooms/{roomId}/messages` body `{ content }`
- `PUT /api/dm/rooms/{roomId}/read`
- `DELETE /api/dm/rooms/{roomId}`
- `GET /api/dm/rooms/{roomId}/messages/new?lastMessageId=0`
- `GET /api/dm/unread-count`

### 7.7 Upload

- `POST /api/upload/image` (`multipart/form-data`, key=`file`)
- `DELETE /api/upload/image/{fileName}`
- 정적 파일 접근: `GET /uploads/{fileName}`

## 8. Kakao OAuth 연동 포인트

- 시작: `GET /api/auth/kakao/login?redirectUrl=<프론트 콜백 URL>`
- 콜백 성공 시 백엔드가 프론트로 redirect
  - URL fragment에 `accessToken`, `user` 포함
  - refreshToken은 쿠키 설정
- 프론트 콜백 페이지 구현
  1. `window.location.hash` 파싱
  2. accessToken 저장
  3. 사용자 상태 주입
  4. hash 제거 후 홈으로 이동

## 9. AI 에이전트 작업 순서 (그대로 실행)

1. `src/api/types.ts` 생성: 공통 타입(`ApiResponse`, `JwtErrorResponse`, `Page`, 도메인 DTO)
2. `src/api/client.ts` 생성: axios 인스턴스 + 인터셉터 + refresh 큐
3. `src/store/authStore.ts` 생성: `accessToken`, `user`, `login/logout/restoreSession`
4. `src/api/auth.ts` 생성: `signup/login/refresh/logout/me`
5. 도메인 API 모듈 생성(post/comment/like/follow/bookmark/feed/hashtag/dm/upload)
6. 페이지 연결
   - 로그인/회원가입
   - 피드 목록/상세
   - 댓글 작성/수정
   - 좋아요/북마크/팔로우 토글
   - 프로필 조회/수정
   - DM 목록/대화방
7. 전역 에러 처리
   - 400/401/403/404/409 토스트 규칙
8. 수동 검증 시나리오 실행 (10장 체크리스트)

## 10. 수동 검증 체크리스트

- 로그인 성공 후 `GET /api/user/me` 성공
- Access Token을 고의 만료/삭제 후 요청 시 자동 refresh 1회 성공
- refresh 실패 시 로그인 페이지로 강제 이동
- 이미지 업로드 후 반환된 `imageUrl` 렌더링 성공
- 게시글 with-images 작성 성공
- 좋아요/북마크/팔로우 토글 시 카운트 즉시 반영
- DM 읽음 처리 후 unread count 감소
- 로그아웃 후 보호 API 접근 시 401

## 11. 자주 발생하는 실수

- `withCredentials` 누락으로 refresh 쿠키 미전송
- `/api/logout` 호출 (오답). 정답은 `/logout`
- `POST /api/posts/with-images`에서 `post`를 일반 문자열로 보내 JSON 파싱 실패
- 401을 전부 로그아웃 처리해서 UX 깨짐 (`TOKEN_EXPIRED`는 refresh 후 재시도해야 함)
- 컨트롤러 주석만 믿고 무인증 호출 구현 (실제 보안 설정과 다를 수 있음)

## 12. 참고한 백엔드 코드 위치

- 인증/보안
  - `src/main/java/com/example/myauth/config/SecurityConfig.java`
  - `src/main/java/com/example/myauth/controller/AuthController.java`
  - `src/main/java/com/example/myauth/security/JwtAuthenticationFilter.java`
  - `src/main/java/com/example/myauth/security/CustomLogoutHandler.java`
- 도메인 API
  - `src/main/java/com/example/myauth/controller/*Controller.java`
- 응답/에러 포맷
  - `src/main/java/com/example/myauth/dto/ApiResponse.java`
  - `src/main/java/com/example/myauth/dto/JwtErrorResponse.java`
  - `src/main/java/com/example/myauth/exception/GlobalExceptionHandler.java`
- 환경/CORS/쿠키
  - `src/main/resources/application-dev.yaml`
  - `src/main/java/com/example/myauth/config/AppProperties.java`
  - `src/main/java/com/example/myauth/config/CorsConfig.java`
