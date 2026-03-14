# Admin 기능 프론트엔드 개발 가이드 (React + JS)

이 문서는 현재 백엔드 코드 기준으로 관리자(Admin) 페이지를 구현하기 위한 연동 가이드다.
설계 문서가 아니라 실제 동작 중인 API/응답/제약을 기준으로 작성했다.

## 1) 구현 대상과 전제

- 관리자 API prefix: `/api/admin`
- 접근 권한: `ROLE_ADMIN` 필수 (`/api/admin/**`)
- 인증 방식: 기존 서비스와 동일
  - Access Token: `Authorization: Bearer <token>`
  - Refresh Token: HttpOnly 쿠키
- 공통 응답: `ApiResponse<T>`
  - 성공: `{ success: true, message: string, data: T }`
  - 비즈니스 실패: `{ success: false, message: string, data: null }`

## 2) 권한/인증 에러 처리 규칙

### 2.1 403 (권한 없음)

관리자 API에 일반 유저가 접근하면 403 + 아래 형태를 받는다.

```json
{
  "success": false,
  "message": "관리자 권한이 필요합니다.",
  "data": null
}
```

프론트 처리:

- 관리자 전용 라우트에서 위 메시지 감지 시 `/` 또는 `/forbidden`으로 이동
- 토큰 만료(401)와 권한 부족(403)을 분리 처리

### 2.2 401 (인증 실패)

토큰 만료/유효하지 않음은 기존 JWT 에러 포맷(`TOKEN_EXPIRED`, `INVALID_TOKEN`) 또는 Unauthorized JSON이 올 수 있다.
기존 앱 인터셉터(401 -> refresh 재시도)를 재사용한다.

## 3) API 목록 (현재 코드 기준)

## 3.1 Dashboard

- `GET /api/admin/dashboard/stats`
- `GET /api/admin/dashboard/recent-users?limit=10`
- `GET /api/admin/dashboard/recent-posts?limit=10`

## 3.2 User 관리

- `GET /api/admin/users?keyword=&status=&role=&page=0&size=20`
- `GET /api/admin/users/{userId}`
- `PUT /api/admin/users/{userId}/status`
- `PUT /api/admin/users/{userId}/role`
- `POST /api/admin/users/{userId}/force-logout`

## 3.3 Post 관리

- `GET /api/admin/posts?keyword=&isDeleted=&page=0&size=20`
- `GET /api/admin/posts/{postId}`
- `DELETE /api/admin/posts/{postId}`
- `PUT /api/admin/posts/{postId}/restore`
- `PUT /api/admin/posts/{postId}/visibility`

## 3.4 Comment 관리

- `GET /api/admin/comments?keyword=&postId=&page=0&size=20`
- `DELETE /api/admin/comments/{commentId}`

## 4) 응답 DTO 핵심 스펙

## 4.1 페이지네이션

Spring `Page<T>` 그대로 반환된다.

```ts
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};
```

## 4.2 Dashboard Stats

```ts
export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  totalComments: number;
  totalDmRooms: number;
  todayNewUsers: number;
  todayNewPosts: number;
  weeklyNewUsers: number;
  weeklyNewPosts: number;
};
```

## 4.3 AdminUserListResponse

```ts
export type AdminUserListItem = {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: 'ROLE_ADMIN' | 'ROLE_USER';
  status: 'ACTIVE' | 'DELETED' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  isActive: boolean;
  provider: string; // LOCAL, KAKAO ...
  postCount: number;
  followerCount: number;
  createdAt: string;
  lastLoginAt: string | null;
};
```

## 4.4 AdminUserDetailResponse

```ts
export type AdminUserDetail = {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: string;
  status: string;
  isActive: boolean;
  isSuperUser: boolean;
  provider: string;
  createdAt: string;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  profile: {
    lastName: string | null;
    firstName: string | null;
    phoneNumber: string | null;
    birth: string | null;
    bgImage: string | null;
  };
  stats: {
    postCount: number;
    commentCount: number;
    likeCount: number;
    followerCount: number;
    followingCount: number;
    bookmarkCount: number;
  };
};
```

## 4.5 AdminPostListResponse

```ts
export type AdminPostItem = {
  id: number;
  content: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isDeleted: boolean;
  author: { id: number; name: string; email: string };
  imageCount: number | null;
  createdAt: string;
};
```

중요:

- 목록 API(`GET /api/admin/posts`)에서는 `imageCount`가 `null`일 수 있다.
- 상세 API(`GET /api/admin/posts/{id}`)에서는 `imageCount`가 채워질 가능성이 높다.

## 4.6 AdminCommentListResponse

```ts
export type AdminCommentItem = {
  id: number;
  content: string;
  postId: number;
  postContentPreview: string | null;
  author: { id: number; name: string; email: string };
  parentId: number | null;
  likeCount: number;
  isDeleted: boolean;
  createdAt: string;
};
```

## 4.7 강제 로그아웃 응답

`POST /api/admin/users/{userId}/force-logout` 응답 `data` 키는 아래다.

```json
{ "revokedRefreshTokens": 3 }
```

프론트에서 `deleted...`가 아니라 `revokedRefreshTokens`로 읽어야 한다.

## 5) 요청 바디 스펙

## 5.1 상태 변경

```json
{
  "status": "SUSPENDED",
  "reason": "반복 위반"
}
```

## 5.2 역할 변경

```json
{
  "role": "ROLE_ADMIN"
}
```

## 5.3 공개범위 변경

```json
{
  "visibility": "PRIVATE"
}
```

## 6) 백엔드 비즈니스 제약 (UI에서 사전 차단 권장)

다음 케이스는 서버에서 `400 Bad Request`로 막는다.

- 본인 상태 변경 시도
- 본인 계정을 `ROLE_USER`로 강등 시도
- 슈퍼유저(`isSuperUser=true`) 상태/역할 변경 시도
- 비-슈퍼유저가 다른 관리자 상태/역할 변경 시도
- 이미 삭제된 게시글 재삭제
- 삭제되지 않은 게시글 복구 시도
- 이미 삭제된 댓글 재삭제

프론트 UX 권장:

- 버튼 비활성화
- 액션 전 확인 모달
- 실패 메시지 그대로 토스트 노출

## 7) React 라우팅 권장

```text
/admin/dashboard
/admin/users
/admin/users/:id
/admin/posts
/admin/posts/:id
/admin/comments
```

라우트 가드:

- 로그인 + `me.role === 'ROLE_ADMIN'` 확인
- 미충족 시 접근 차단

주의:

- 백엔드가 최종 권한 체크를 수행하므로 프론트 가드는 UX 용도다.

## 8) API 모듈 예시 (JavaScript)

```js
// src/api/adminApi.js
import api from './client'; // axios instance

export const adminApi = {
  getDashboardStats: () => api.get('/api/admin/dashboard/stats'),
  getRecentUsers: (limit = 10) => api.get('/api/admin/dashboard/recent-users', { params: { limit } }),
  getRecentPosts: (limit = 10) => api.get('/api/admin/dashboard/recent-posts', { params: { limit } }),

  getUsers: (params) => api.get('/api/admin/users', { params }),
  getUserDetail: (userId) => api.get(`/api/admin/users/${userId}`),
  changeUserStatus: (userId, body) => api.put(`/api/admin/users/${userId}/status`, body),
  changeUserRole: (userId, body) => api.put(`/api/admin/users/${userId}/role`, body),
  forceLogout: (userId) => api.post(`/api/admin/users/${userId}/force-logout`),

  getPosts: (params) => api.get('/api/admin/posts', { params }),
  getPostDetail: (postId) => api.get(`/api/admin/posts/${postId}`),
  deletePost: (postId) => api.delete(`/api/admin/posts/${postId}`),
  restorePost: (postId) => api.put(`/api/admin/posts/${postId}/restore`),
  changePostVisibility: (postId, body) => api.put(`/api/admin/posts/${postId}/visibility`, body),

  getComments: (params) => api.get('/api/admin/comments', { params }),
  deleteComment: (commentId) => api.delete(`/api/admin/comments/${commentId}`),
};
```

## 9) 페이지별 구현 체크포인트

## 9.1 Dashboard

- 통계 카드 10개 수치
- 최근 사용자/게시글 각 10개 테이블
- 로딩 skeleton + 에러 fallback

## 9.2 Users

- 필터: `keyword`, `status`, `role`
- 테이블 컬럼: 이메일, 이름, 역할, 상태, 게시글수, 팔로워수, 가입일, 최근 로그인
- 액션: 상태변경, 역할변경, 강제로그아웃
- 상세 페이지 이동

## 9.3 User Detail

- 기본 정보 + profile + activity stats
- `isSuperUser` 배지 표시
- 보호 대상이면 액션 버튼 비활성화

## 9.4 Posts

- 필터: `keyword`, `isDeleted(null/true/false)`
- 목록은 `imageCount`가 null일 수 있으니 `-` 표시
- 상세에서 삭제/복구/공개범위 변경

## 9.5 Comments

- 필터: `keyword`, `postId`
- 댓글/대댓글 구분(`parentId`)
- 강제 삭제 액션

## 10) 상태값/열거값 상수화 권장

```js
export const USER_STATUS = ['ACTIVE', 'DELETED', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'];
export const USER_ROLE = ['ROLE_ADMIN', 'ROLE_USER'];
export const POST_VISIBILITY = ['PUBLIC', 'PRIVATE', 'FOLLOWERS'];
```

## 11) 수동 테스트 시나리오

1. `ROLE_USER` 토큰으로 `/api/admin/dashboard/stats` 호출 -> 403 확인
2. `ROLE_ADMIN` 토큰으로 dashboard 3개 API 성공
3. 관리자 목록 필터/페이징 동작 확인
4. 일반 사용자 상태 `SUSPENDED` 후 로그인 차단 확인
5. 강제 로그아웃 후 대상 사용자의 refresh 실패 확인
6. 게시글 삭제/복구/공개범위 변경 확인
7. 댓글 삭제 후 `isDeleted=true`, 내용 변경(`삭제된 댓글입니다.`) 확인

## 12) 문서 기준 소스 파일

- 보안: `src/main/java/com/example/myauth/config/SecurityConfig.java`
- API: `src/main/java/com/example/myauth/controller/AdminController.java`
- 비즈니스: `src/main/java/com/example/myauth/service/AdminService.java`
- DTO: `src/main/java/com/example/myauth/dto/admin/*`
- 쿼리: `src/main/java/com/example/myauth/repository/UserRepository.java`, `PostRepository.java`, `CommentRepository.java`, `FollowRepository.java`
