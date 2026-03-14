# 어드민 페이지 프론트엔드 개발 가이드

> **대상**: React 프론트엔드 개발자 / AI 코딩 에이전트
> **백엔드**: Spring Boot 4.0 + JWT 인증 + REST API
> **최종 수정일**: 2026-03-15

---

## 목차

1. [인증 및 권한](#1-인증-및-권한)
2. [공통 응답 형식](#2-공통-응답-형식)
3. [Enum 값 정의](#3-enum-값-정의)
4. [API 엔드포인트 전체 목록](#4-api-엔드포인트-전체-목록)
5. [대시보드 API](#5-대시보드-api)
6. [사용자 관리 API](#6-사용자-관리-api)
7. [게시글 관리 API](#7-게시글-관리-api)
8. [댓글 관리 API](#8-댓글-관리-api)
9. [에러 응답 처리](#9-에러-응답-처리)
10. [React 구현 가이드](#10-react-구현-가이드)
11. [페이지 구성 권장안](#11-페이지-구성-권장안)
12. [Axios 설정 예시](#12-axios-설정-예시)
13. [TypeScript 타입 정의](#13-typescript-타입-정의)
14. [API 호출 함수 예시](#14-api-호출-함수-예시)
15. [주요 컴포넌트 구현 가이드](#15-주요-컴포넌트-구현-가이드)

---

## 1. 인증 및 권한

### 인증 방식
- **JWT 토큰 기반** (세션 사용 안 함)
- Access Token은 `Authorization: Bearer {token}` 헤더로 전송
- Refresh Token은 **HTTP-only 쿠키**로 자동 관리

### 관리자 권한 요구사항
- 모든 `/api/admin/**` 경로는 `ROLE_ADMIN` 권한 필수
- 사용자의 `role` 필드가 `ROLE_ADMIN`이어야 접근 가능

### 인증 관련 HTTP 상태 코드
| 상태 코드 | 의미 | 응답 형식 |
|-----------|------|-----------|
| `401` | 인증 필요 (토큰 없음/만료) | `{"error":"Unauthorized","message":"인증이 필요합니다."}` |
| `403` | 권한 부족 (ADMIN 아님) | `{"success":false,"message":"관리자 권한이 필요합니다.","data":null}` |

### 프론트엔드 처리
```javascript
// 401 → 로그인 페이지로 리다이렉트 또는 토큰 갱신
// 403 → "관리자 권한이 필요합니다" 알림 표시 → 일반 페이지로 이동
```

---

## 2. 공통 응답 형식

모든 API 응답은 `ApiResponse<T>` 형식을 따릅니다.

### 성공 응답 (데이터 포함)
```json
{
  "success": true,
  "message": "조회 성공",
  "data": { ... }
}
```

### 성공 응답 (데이터 없음)
```json
{
  "success": true,
  "message": "삭제되었습니다.",
  "data": null
}
```

### 에러 응답
```json
{
  "success": false,
  "message": "에러 메시지",
  "data": null
}
```

### 페이징 응답 구조
`Page<T>` 타입의 응답은 `data` 내부에 다음 구조를 가집니다:
```json
{
  "success": true,
  "message": "조회 성공",
  "data": {
    "content": [ ... ],          // 실제 데이터 배열
    "pageable": {
      "pageNumber": 0,           // 현재 페이지 (0-based)
      "pageSize": 20,            // 페이지 크기
      "sort": { ... },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalPages": 5,             // 전체 페이지 수
    "totalElements": 100,        // 전체 데이터 수
    "last": false,               // 마지막 페이지 여부
    "first": true,               // 첫 페이지 여부
    "size": 20,                  // 페이지 크기
    "number": 0,                 // 현재 페이지 번호
    "numberOfElements": 20,      // 현재 페이지의 데이터 수
    "empty": false               // 빈 페이지 여부
  }
}
```

---

## 3. Enum 값 정의

### User.Role (사용자 역할)
| 값 | 설명 |
|----|------|
| `ROLE_USER` | 일반 사용자 (기본값) |
| `ROLE_ADMIN` | 관리자 |

### User.Status (사용자 상태)
| 값 | 설명 | UI 표시 권장 |
|----|------|-------------|
| `ACTIVE` | 활성 (정상 사용 중) | 🟢 초록색 뱃지 |
| `SUSPENDED` | 정지 (관리자가 정지) | 🔴 빨간색 뱃지 |
| `DELETED` | 삭제 (계정 삭제) | ⚫ 회색 뱃지 |
| `INACTIVE` | 비활성 (장기 미접속) | 🟡 노란색 뱃지 |
| `PENDING_VERIFICATION` | 이메일 인증 대기 | 🔵 파란색 뱃지 |

### Visibility (게시글 공개 범위)
| 값 | 설명 |
|----|------|
| `PUBLIC` | 전체 공개 (기본값) |
| `FOLLOWERS` | 팔로워에게만 공개 |
| `PRIVATE` | 비공개 (작성자만) |

---

## 4. API 엔드포인트 전체 목록

모든 엔드포인트의 Base URL: `/api/admin`

| # | HTTP | URL | 기능 | 요청 Body |
|---|------|-----|------|----------|
| 1 | `GET` | `/dashboard/stats` | 대시보드 통계 | - |
| 2 | `GET` | `/dashboard/daily-stats?days=30` | 일별 통계 (차트용) | - |
| 3 | `GET` | `/dashboard/recent-users?limit=10` | 최근 가입 사용자 | - |
| 4 | `GET` | `/dashboard/recent-posts?limit=10` | 최근 게시글 | - |
| 5 | `GET` | `/users?keyword=&status=&role=&page=0&size=20` | 사용자 목록 | - |
| 6 | `GET` | `/users/{userId}` | 사용자 상세 | - |
| 7 | `PUT` | `/users/{userId}/status` | 사용자 상태 변경 | ✅ |
| 8 | `PUT` | `/users/{userId}/role` | 사용자 역할 변경 | ✅ |
| 9 | `POST` | `/users/{userId}/force-logout` | 강제 로그아웃 | - |
| 10 | `GET` | `/posts?keyword=&isDeleted=&page=0&size=20` | 게시글 목록 | - |
| 11 | `GET` | `/posts/{postId}` | 게시글 상세 | - |
| 12 | `DELETE` | `/posts/{postId}` | 게시글 삭제 | - |
| 13 | `PUT` | `/posts/{postId}/restore` | 게시글 복구 | - |
| 14 | `PUT` | `/posts/{postId}/visibility` | 공개 범위 변경 | ✅ |
| 15 | `GET` | `/comments?keyword=&postId=&page=0&size=20` | 댓글 목록 | - |
| 16 | `DELETE` | `/comments/{commentId}` | 댓글 삭제 | - |

---

## 5. 대시보드 API

### 5-1. 대시보드 통계 조회

```
GET /api/admin/dashboard/stats
```

**응답 데이터:**
```typescript
{
  totalUsers: number;        // 전체 사용자 수
  activeUsers: number;       // 활성 사용자 수
  suspendedUsers: number;    // 정지된 사용자 수
  totalPosts: number;        // 전체 게시글 수
  totalComments: number;     // 전체 댓글 수
  totalDmRooms: number;      // 전체 DM 채팅방 수
  todayNewUsers: number;     // 오늘 신규 가입자 수
  todayNewPosts: number;     // 오늘 신규 게시글 수
  weeklyNewUsers: number;    // 이번 주 신규 가입자 수
  weeklyNewPosts: number;    // 이번 주 신규 게시글 수
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "대시보드 통계 조회 성공",
  "data": {
    "totalUsers": 1520,
    "activeUsers": 1340,
    "suspendedUsers": 15,
    "totalPosts": 8750,
    "totalComments": 23400,
    "totalDmRooms": 680,
    "todayNewUsers": 12,
    "todayNewPosts": 45,
    "weeklyNewUsers": 78,
    "weeklyNewPosts": 320
  }
}
```

---

### 5-2. 일별 통계 조회 (차트용 시계열 데이터)

```
GET /api/admin/dashboard/daily-stats?days=30
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `days` | int | 30 | 조회 기간 (일 수, 최소 1, 최대 90) |

**응답 데이터:** `AdminDailyStatsResponse[]` (배열, 최신 날짜 먼저)

```json
{
  "success": true,
  "message": "일별 통계 조회 성공",
  "data": [
    {
      "date": "2026-03-15",
      "newUsers": 3,
      "newPosts": 12,
      "newComments": 28,
      "totalViews": 156
    },
    {
      "date": "2026-03-14",
      "newUsers": 5,
      "newPosts": 8,
      "newComments": 15,
      "totalViews": 203
    },
    {
      "date": "2026-03-13",
      "newUsers": 2,
      "newPosts": 15,
      "newComments": 42,
      "totalViews": 312
    }
  ]
}
```

> **특징:**
> - 데이터가 없는 날짜도 0으로 채워져서 연속적인 시계열 데이터가 보장됩니다.
> - `totalViews`는 해당 날짜에 작성된 게시글들의 누적 조회수 합계입니다.
> - 최신 날짜가 배열의 앞에 옵니다 (내림차순).
> - 차트 라이브러리(Recharts, Chart.js 등)에서 바로 사용할 수 있는 형식입니다.

**React 차트 사용 예시 (Recharts):**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// API 데이터를 역순으로 정렬 (오래된 날짜 → 최신 날짜)
const chartData = dailyStats.slice().reverse();

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="newUsers" stroke="#3b82f6" name="신규 가입" />
    <Line type="monotone" dataKey="newPosts" stroke="#22c55e" name="신규 게시글" />
    <Line type="monotone" dataKey="newComments" stroke="#eab308" name="신규 댓글" />
    <Line type="monotone" dataKey="totalViews" stroke="#ef4444" name="조회수" />
  </LineChart>
</ResponsiveContainer>
```

---

### 5-3. 최근 가입 사용자 조회

```
GET /api/admin/dashboard/recent-users?limit=10
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `limit` | int | 10 | 조회 건수 (최대 50) |

**응답 데이터:** `AdminUserListResponse[]` (배열, 페이징 없음)

```json
{
  "success": true,
  "message": "최근 가입 사용자 조회 성공",
  "data": [
    {
      "id": 42,
      "email": "newuser@example.com",
      "name": "홍길동",
      "profileImage": "https://example.com/profile/42.jpg",
      "role": "ROLE_USER",
      "status": "ACTIVE",
      "isActive": true,
      "provider": "KAKAO",
      "postCount": 3,
      "followerCount": 12,
      "createdAt": "2026-03-15T09:30:00",
      "lastLoginAt": "2026-03-15T14:20:00"
    }
  ]
}
```

---

### 5-3. 최근 게시글 조회

```
GET /api/admin/dashboard/recent-posts?limit=10
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `limit` | int | 10 | 조회 건수 (최대 50) |

**응답 데이터:** `AdminPostListResponse[]` (배열, 페이징 없음)

> 참고: 대시보드에서는 삭제되지 않은 활성 게시글만 표시됩니다.

```json
{
  "success": true,
  "message": "최근 게시글 조회 성공",
  "data": [
    {
      "id": 150,
      "content": "오늘 날씨가 정말 좋네요! 공원에서 산책하기 딱 좋은...",
      "visibility": "PUBLIC",
      "likeCount": 25,
      "commentCount": 8,
      "viewCount": 340,
      "isDeleted": false,
      "author": {
        "id": 10,
        "name": "이순신",
        "email": "lee@example.com"
      },
      "imageCount": null,
      "createdAt": "2026-03-15T11:00:00"
    }
  ]
}
```

> **주의**: 목록 조회에서 `imageCount`는 `null`입니다. 이미지 수는 게시글 상세 조회에서만 제공됩니다.

---

## 6. 사용자 관리 API

### 6-1. 사용자 목록 조회 (페이징 + 필터링)

```
GET /api/admin/users?keyword=홍길동&status=ACTIVE&role=ROLE_USER&page=0&size=20
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|-------|------|
| `keyword` | string | ❌ | - | 이메일 또는 이름 검색 |
| `status` | string | ❌ | - | 상태 필터 (`ACTIVE`, `SUSPENDED`, `DELETED`, `INACTIVE`, `PENDING_VERIFICATION`) |
| `role` | string | ❌ | - | 역할 필터 (`ROLE_USER`, `ROLE_ADMIN`) |
| `page` | int | ❌ | 0 | 페이지 번호 (0-based) |
| `size` | int | ❌ | 20 | 페이지 크기 (최대 50) |

**응답 데이터:** `Page<AdminUserListResponse>`

```json
{
  "success": true,
  "message": "관리자 사용자 목록 조회 성공",
  "data": {
    "content": [
      {
        "id": 1,
        "email": "admin@example.com",
        "name": "관리자",
        "profileImage": null,
        "role": "ROLE_ADMIN",
        "status": "ACTIVE",
        "isActive": true,
        "provider": "LOCAL",
        "postCount": 0,
        "followerCount": 50,
        "createdAt": "2025-01-01T00:00:00",
        "lastLoginAt": "2026-03-15T10:00:00"
      }
    ],
    "totalPages": 8,
    "totalElements": 150,
    "number": 0,
    "size": 20,
    "first": true,
    "last": false,
    "empty": false
  }
}
```

---

### 6-2. 사용자 상세 조회

```
GET /api/admin/users/{userId}
```

**Path 파라미터:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `userId` | Long | 사용자 ID |

**응답 데이터:** `AdminUserDetailResponse`

```json
{
  "success": true,
  "message": "관리자 사용자 상세 조회 성공",
  "data": {
    "id": 42,
    "email": "user42@example.com",
    "name": "홍길동",
    "profileImage": "https://example.com/profile/42.jpg",
    "role": "ROLE_USER",
    "status": "ACTIVE",
    "isActive": true,
    "isSuperUser": false,
    "provider": "KAKAO",
    "createdAt": "2025-06-15T10:30:00",
    "lastLoginAt": "2026-03-15T14:20:00",
    "failedLoginAttempts": 0,
    "profile": {
      "lastName": "홍",
      "firstName": "길동",
      "phoneNumber": "010-1234-5678",
      "birth": "1995-03-20T00:00:00",
      "bgImage": "https://example.com/bg/42.jpg"
    },
    "stats": {
      "postCount": 45,
      "commentCount": 230,
      "likeCount": 560,
      "followerCount": 120,
      "followingCount": 85,
      "bookmarkCount": 30
    }
  }
}
```

> **UI 표시 팁**: `isSuperUser: true`인 경우 상태/역할 변경 버튼을 비활성화하세요.

---

### 6-3. 사용자 상태 변경

```
PUT /api/admin/users/{userId}/status
Content-Type: application/json
```

**요청 Body:**
```json
{
  "status": "SUSPENDED",
  "reason": "스팸 게시글 다수 게시로 인한 정지"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | string | ✅ | 변경할 상태 (`ACTIVE`, `SUSPENDED`, `DELETED`, `INACTIVE`, `PENDING_VERIFICATION`) |
| `reason` | string | ❌ | 변경 사유 |

**성공 응답:**
```json
{
  "success": true,
  "message": "사용자 상태가 변경되었습니다.",
  "data": null
}
```

**비즈니스 규칙 (에러 발생 조건):**
| 조건 | 에러 메시지 | HTTP 코드 |
|------|-----------|----------|
| 본인 계정 변경 시도 | 본인 계정 상태는 변경할 수 없습니다. | 400 |
| 슈퍼유저 변경 시도 | 슈퍼유저의 상태는 변경할 수 없습니다. | 400 |
| 다른 관리자 변경 (슈퍼유저 아닌 경우) | 다른 관리자의 상태를 변경하려면 슈퍼유저 권한이 필요합니다. | 400 |
| 존재하지 않는 사용자 | (UserNotFoundException) | 404 |

---

### 6-4. 사용자 역할 변경

```
PUT /api/admin/users/{userId}/role
Content-Type: application/json
```

**요청 Body:**
```json
{
  "role": "ROLE_ADMIN"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `role` | string | ✅ | 변경할 역할 (`ROLE_USER`, `ROLE_ADMIN`) |

**성공 응답:**
```json
{
  "success": true,
  "message": "사용자 역할이 변경되었습니다.",
  "data": null
}
```

**비즈니스 규칙 (에러 발생 조건):**
| 조건 | 에러 메시지 | HTTP 코드 |
|------|-----------|----------|
| 본인을 일반 사용자로 강등 | 본인 계정을 일반 사용자로 변경할 수 없습니다. | 400 |
| 슈퍼유저 역할 변경 시도 | 슈퍼유저의 역할은 변경할 수 없습니다. | 400 |
| 다른 관리자 변경 (슈퍼유저 아닌 경우) | 다른 관리자의 역할을 변경하려면 슈퍼유저 권한이 필요합니다. | 400 |

---

### 6-5. 강제 로그아웃

```
POST /api/admin/users/{userId}/force-logout
```

**요청 Body:** 없음

**성공 응답:**
```json
{
  "success": true,
  "message": "강제 로그아웃 처리 완료",
  "data": {
    "revokedRefreshTokens": 3
  }
}
```

> 해당 사용자의 모든 Refresh Token을 무효화합니다. 사용자는 다음 API 호출 시 Access Token 만료 후 재로그인이 필요합니다.

---

## 7. 게시글 관리 API

### 7-1. 게시글 목록 조회 (페이징 + 필터링)

```
GET /api/admin/posts?keyword=검색어&isDeleted=false&page=0&size=20
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|-------|------|
| `keyword` | string | ❌ | - | 게시글 내용 또는 작성자명 검색 |
| `isDeleted` | boolean | ❌ | - | 삭제 여부 필터 (`true`: 삭제됨만, `false`: 활성만, 미전송: 전체) |
| `page` | int | ❌ | 0 | 페이지 번호 (0-based) |
| `size` | int | ❌ | 20 | 페이지 크기 (최대 50) |

**응답 데이터:** `Page<AdminPostListResponse>`

```json
{
  "success": true,
  "message": "관리자 게시글 목록 조회 성공",
  "data": {
    "content": [
      {
        "id": 150,
        "content": "게시글 내용 미리보기 (200자까지 표시, 초과 시 '...' 추가)...",
        "visibility": "PUBLIC",
        "likeCount": 25,
        "commentCount": 8,
        "viewCount": 340,
        "isDeleted": false,
        "author": {
          "id": 10,
          "name": "이순신",
          "email": "lee@example.com"
        },
        "imageCount": null,
        "createdAt": "2026-03-15T11:00:00"
      }
    ],
    "totalPages": 44,
    "totalElements": 875,
    "number": 0,
    "size": 20,
    "first": true,
    "last": false,
    "empty": false
  }
}
```

> **참고**: `content`는 200자까지만 미리보기로 제공됩니다. 전체 내용은 상세 조회에서 확인하세요.
> **참고**: `imageCount`는 목록 조회에서 `null`입니다.

---

### 7-2. 게시글 상세 조회

```
GET /api/admin/posts/{postId}
```

**응답 데이터:** `AdminPostListResponse` (imageCount 포함)

```json
{
  "success": true,
  "message": "관리자 게시글 상세 조회 성공",
  "data": {
    "id": 150,
    "content": "게시글 전체 내용이 여기에 표시됩니다. 200자 제한 없이 전체 표시.",
    "visibility": "PUBLIC",
    "likeCount": 25,
    "commentCount": 8,
    "viewCount": 340,
    "isDeleted": false,
    "author": {
      "id": 10,
      "name": "이순신",
      "email": "lee@example.com"
    },
    "imageCount": 3,
    "createdAt": "2026-03-15T11:00:00"
  }
}
```

> **차이점**: 상세 조회에서는 `content` 전체 내용과 `imageCount`가 제공됩니다.

---

### 7-3. 게시글 삭제 (Soft Delete)

```
DELETE /api/admin/posts/{postId}
```

**성공 응답:**
```json
{
  "success": true,
  "message": "게시글이 삭제되었습니다.",
  "data": null
}
```

**에러:**
| 조건 | 에러 메시지 | HTTP 코드 |
|------|-----------|----------|
| 이미 삭제된 게시글 | 이미 삭제된 게시글입니다. | 400 |
| 존재하지 않는 게시글 | (PostNotFoundException) | 404 |

---

### 7-4. 게시글 복구

```
PUT /api/admin/posts/{postId}/restore
```

**성공 응답:**
```json
{
  "success": true,
  "message": "게시글이 복구되었습니다.",
  "data": null
}
```

**에러:**
| 조건 | 에러 메시지 | HTTP 코드 |
|------|-----------|----------|
| 삭제되지 않은 게시글 | 삭제되지 않은 게시글입니다. | 400 |

---

### 7-5. 게시글 공개 범위 변경

```
PUT /api/admin/posts/{postId}/visibility
Content-Type: application/json
```

**요청 Body:**
```json
{
  "visibility": "PRIVATE"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `visibility` | string | ✅ | 변경할 공개 범위 (`PUBLIC`, `FOLLOWERS`, `PRIVATE`) |

**성공 응답:**
```json
{
  "success": true,
  "message": "게시글 공개 범위가 변경되었습니다.",
  "data": null
}
```

---

## 8. 댓글 관리 API

### 8-1. 댓글 목록 조회 (페이징 + 필터링)

```
GET /api/admin/comments?keyword=검색어&postId=10&page=0&size=20
```

**쿼리 파라미터:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|-------|------|
| `keyword` | string | ❌ | - | 댓글 내용 또는 작성자명 검색 |
| `postId` | Long | ❌ | - | 특정 게시글의 댓글만 조회 |
| `page` | int | ❌ | 0 | 페이지 번호 (0-based) |
| `size` | int | ❌ | 20 | 페이지 크기 (최대 50) |

**응답 데이터:** `Page<AdminCommentListResponse>`

```json
{
  "success": true,
  "message": "관리자 댓글 목록 조회 성공",
  "data": {
    "content": [
      {
        "id": 500,
        "content": "좋은 게시글이네요!",
        "postId": 150,
        "postContentPreview": "오늘 날씨가 정말 좋네요! 공원에서 산책하기 딱 좋은...",
        "author": {
          "id": 20,
          "name": "세종대왕",
          "email": "sejong@example.com"
        },
        "parentId": null,
        "likeCount": 3,
        "isDeleted": false,
        "createdAt": "2026-03-15T12:30:00"
      },
      {
        "id": 501,
        "content": "저도 그렇게 생각합니다!",
        "postId": 150,
        "postContentPreview": "오늘 날씨가 정말 좋네요! 공원에서 산책하기 딱 좋은...",
        "author": {
          "id": 25,
          "name": "장보고",
          "email": "jang@example.com"
        },
        "parentId": 500,
        "likeCount": 1,
        "isDeleted": false,
        "createdAt": "2026-03-15T13:00:00"
      }
    ],
    "totalPages": 117,
    "totalElements": 2340,
    "number": 0,
    "size": 20
  }
}
```

> **참고**: `parentId`가 `null`이면 최상위 댓글이고, 값이 있으면 대댓글(답글)입니다.
> **참고**: `postContentPreview`는 50자까지만 미리보기로 제공됩니다.

---

### 8-2. 댓글 삭제 (Soft Delete)

```
DELETE /api/admin/comments/{commentId}
```

**성공 응답:**
```json
{
  "success": true,
  "message": "댓글이 삭제되었습니다.",
  "data": null
}
```

**에러:**
| 조건 | 에러 메시지 | HTTP 코드 |
|------|-----------|----------|
| 이미 삭제된 댓글 | 이미 삭제된 댓글입니다. | 400 |
| 존재하지 않는 댓글 | (CommentNotFoundException) | 404 |

---

## 9. 에러 응답 처리

### HTTP 상태 코드별 에러 처리

| HTTP 코드 | 의미 | 프론트엔드 처리 |
|-----------|------|---------------|
| `400` | 잘못된 요청 (비즈니스 규칙 위반) | `data.message` 표시 |
| `401` | 인증 필요 (토큰 없음/만료) | 로그인 페이지 리다이렉트 또는 토큰 갱신 |
| `403` | 권한 부족 (ADMIN 아님) | "관리자 권한이 필요합니다" 알림 |
| `404` | 리소스 없음 | "해당 항목을 찾을 수 없습니다" 알림 |
| `500` | 서버 에러 | "서버 오류가 발생했습니다" 알림 |

### 에러 응답 예시

**400 Bad Request:**
```json
{
  "success": false,
  "message": "슈퍼유저의 상태는 변경할 수 없습니다.",
  "data": null
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "사용자를 찾을 수 없습니다.",
  "data": null
}
```

---

## 10. React 구현 가이드

### 프로젝트 구조 권장안

```
src/
├── pages/
│   └── admin/
│       ├── AdminLayout.tsx          # 어드민 전용 레이아웃 (사이드바 + 헤더)
│       ├── DashboardPage.tsx        # 대시보드 (통계 카드 + 최근 활동)
│       ├── UserListPage.tsx         # 사용자 목록 (검색/필터/페이징)
│       ├── UserDetailPage.tsx       # 사용자 상세 (프로필 + 활동통계 + 액션)
│       ├── PostListPage.tsx         # 게시글 목록 (검색/필터/페이징)
│       ├── PostDetailPage.tsx       # 게시글 상세 (내용 + 액션)
│       └── CommentListPage.tsx      # 댓글 목록 (검색/필터/페이징)
├── components/
│   └── admin/
│       ├── StatCard.tsx             # 통계 카드 컴포넌트
│       ├── UserTable.tsx            # 사용자 테이블
│       ├── PostTable.tsx            # 게시글 테이블
│       ├── CommentTable.tsx         # 댓글 테이블
│       ├── Pagination.tsx           # 페이징 컴포넌트
│       ├── SearchFilter.tsx         # 검색/필터 바
│       ├── StatusBadge.tsx          # 상태 뱃지
│       ├── RoleBadge.tsx            # 역할 뱃지
│       ├── ConfirmModal.tsx         # 확인 모달 (삭제, 상태변경 등)
│       └── AdminSidebar.tsx         # 사이드바 네비게이션
├── api/
│   └── adminApi.ts                  # 어드민 API 호출 함수 모음
├── types/
│   └── admin.ts                     # TypeScript 타입 정의
└── hooks/
    └── useAdmin.ts                  # 어드민 관련 커스텀 훅
```

### 라우트 설정

```tsx
// App.tsx 또는 Router 설정
import { Routes, Route } from 'react-router-dom';

<Routes>
  {/* 어드민 라우트 - AdminLayout으로 감싸기 */}
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="users" element={<UserListPage />} />
    <Route path="users/:userId" element={<UserDetailPage />} />
    <Route path="posts" element={<PostListPage />} />
    <Route path="posts/:postId" element={<PostDetailPage />} />
    <Route path="comments" element={<CommentListPage />} />
  </Route>
</Routes>
```

---

## 11. 페이지 구성 권장안

### 11-1. 대시보드 페이지

```
┌─────────────────────────────────────────────────────┐
│ 📊 대시보드                                          │
├─────────────┬──────────────┬──────────────┬──────────┤
│ 전체 사용자  │ 활성 사용자   │ 정지 사용자   │ 전체 게시글│
│   1,520     │   1,340      │     15       │   8,750  │
├─────────────┼──────────────┼──────────────┼──────────┤
│ 전체 댓글    │ 전체 DM방    │ 오늘 가입     │ 오늘 게시글│
│  23,400     │    680       │     12       │    45    │
├─────────────┴──────────────┼──────────────┴──────────┤
│ 🆕 최근 가입 사용자 (10명)  │ 📝 최근 게시글 (10개)     │
│ ┌────┬───────┬────┬─────┐ │ ┌────┬──────┬───┬─────┐ │
│ │이름│ 이메일 │상태│가입일│ │ │작성자│ 내용 │♥ │ 날짜 │ │
│ │... │  ...  │ ...│ ... │ │ │ ... │ ... │...│ ... │ │
│ └────┴───────┴────┴─────┘ │ └────┴──────┴───┴─────┘ │
└───────────────────────────┴──────────────────────────┘
```

### 11-2. 사용자 목록 페이지

```
┌──────────────────────────────────────────────────────┐
│ 👥 사용자 관리                                        │
├──────────────────────────────────────────────────────┤
│ 🔍 [검색어 입력____] [상태 ▼] [역할 ▼] [검색]        │
├──────────────────────────────────────────────────────┤
│  # │ 프로필  │ 이름/이메일    │ 역할  │ 상태  │ 가입자│ 가입일     │
│────┼────────┼──────────────┼──────┼──────┼──────┼──────────┤
│  1 │ 🖼️     │ 홍길동        │ USER │🟢활성│ KAKAO│ 2025-06  │
│    │        │ hong@ex.com  │      │      │      │          │
│────┼────────┼──────────────┼──────┼──────┼──────┼──────────┤
│  2 │ 🖼️     │ 이순신        │ADMIN │🟢활성│ LOCAL│ 2025-01  │
│    │        │ lee@ex.com   │      │      │      │          │
├──────────────────────────────────────────────────────┤
│               ◀ 1  2  3  4  5  ▶                     │
└──────────────────────────────────────────────────────┘
```

### 11-3. 사용자 상세 페이지

```
┌──────────────────────────────────────────────────────┐
│ 👤 사용자 상세 - 홍길동 (#42)                          │
├────────────────────────┬─────────────────────────────┤
│ 🖼️ 프로필 이미지       │ 📋 기본 정보                  │
│                        │ 이메일: hong@example.com     │
│                        │ 역할: ROLE_USER              │
│                        │ 상태: 🟢 ACTIVE              │
│                        │ 로그인: KAKAO                │
│                        │ 가입일: 2025-06-15           │
│                        │ 마지막 로그인: 2026-03-15     │
├────────────────────────┼─────────────────────────────┤
│ 📊 활동 통계            │ 📝 프로필 정보               │
│ 게시글: 45  댓글: 230   │ 이름: 홍 길동                │
│ 좋아요: 560 북마크: 30  │ 전화: 010-1234-5678         │
│ 팔로워: 120 팔로잉: 85  │ 생일: 1995-03-20            │
├────────────────────────┴─────────────────────────────┤
│ ⚡ 관리 액션                                          │
│ [상태 변경 ▼] [역할 변경 ▼] [강제 로그아웃]             │
│                                                      │
│ ⚠️ 슈퍼유저는 상태/역할 변경이 불가합니다.              │
└──────────────────────────────────────────────────────┘
```

---

## 12. Axios 설정 예시

```typescript
// src/api/axiosInstance.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 쿠키(Refresh Token) 자동 전송
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: Access Token 자동 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 토큰 갱신 시도
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh Token으로 Access Token 갱신
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // 갱신 실패 시 로그인 페이지로 이동
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 403 에러: 관리자 권한 부족
    if (error.response?.status === 403) {
      alert('관리자 권한이 필요합니다.');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

---

## 13. TypeScript 타입 정의

```typescript
// src/types/admin.ts

// ===== 공통 응답 타입 =====

/** API 공통 응답 래퍼 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/** Spring Data Page 응답 */
interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;        // 현재 페이지 (0-based)
  size: number;          // 페이지 크기
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

// ===== Enum 타입 =====

type UserRole = 'ROLE_USER' | 'ROLE_ADMIN';

type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'INACTIVE' | 'PENDING_VERIFICATION';

type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

// ===== 대시보드 =====

/** 일별 통계 (차트용 시계열 데이터) */
interface DailyStats {
  date: string;              // "yyyy-MM-dd" 형식
  newUsers: number;
  newPosts: number;
  newComments: number;
  totalViews: number;
}

/** 대시보드 통계 */
interface DashboardStats {
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
}

// ===== 사용자 관리 =====

/** 사용자 목록 항목 */
interface AdminUser {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  provider: string;          // 'LOCAL' | 'KAKAO' | 'GOOGLE'
  postCount: number;
  followerCount: number;
  createdAt: string;         // ISO 8601 (예: "2025-06-15T10:30:00")
  lastLoginAt: string | null;
}

/** 사용자 프로필 정보 */
interface ProfileInfo {
  lastName: string | null;
  firstName: string | null;
  phoneNumber: string | null;
  birth: string | null;       // ISO 8601
  bgImage: string | null;
}

/** 사용자 활동 통계 */
interface UserActivityStats {
  postCount: number;
  commentCount: number;
  likeCount: number;
  followerCount: number;
  followingCount: number;
  bookmarkCount: number;
}

/** 사용자 상세 정보 */
interface AdminUserDetail {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  isSuperUser: boolean;
  provider: string;
  createdAt: string;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  profile: ProfileInfo;
  stats: UserActivityStats;
}

/** 사용자 상태 변경 요청 */
interface StatusChangeRequest {
  status: UserStatus;
  reason?: string;
}

/** 사용자 역할 변경 요청 */
interface RoleChangeRequest {
  role: UserRole;
}

// ===== 게시글 관리 =====

/** 게시글 작성자 정보 */
interface AdminAuthorInfo {
  id: number;
  name: string;
  email: string;
}

/** 게시글 목록/상세 항목 */
interface AdminPost {
  id: number;
  content: string;             // 목록: 200자 미리보기, 상세: 전체 내용
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isDeleted: boolean;
  author: AdminAuthorInfo;
  imageCount: number | null;   // 목록: null, 상세: 실제 이미지 수
  createdAt: string;
}

/** 게시글 공개 범위 변경 요청 */
interface VisibilityChangeRequest {
  visibility: Visibility;
}

// ===== 댓글 관리 =====

/** 댓글 목록 항목 */
interface AdminComment {
  id: number;
  content: string;
  postId: number;
  postContentPreview: string;   // 게시글 내용 미리보기 (50자)
  author: AdminAuthorInfo;
  parentId: number | null;      // null이면 최상위 댓글, 값 있으면 대댓글
  likeCount: number;
  isDeleted: boolean;
  createdAt: string;
}

// ===== 강제 로그아웃 응답 =====

interface ForceLogoutResponse {
  revokedRefreshTokens: number;
}

// ===== Export =====

export type {
  ApiResponse,
  Page,
  UserRole,
  UserStatus,
  Visibility,
  DailyStats,
  DashboardStats,
  AdminUser,
  AdminUserDetail,
  ProfileInfo,
  UserActivityStats,
  StatusChangeRequest,
  RoleChangeRequest,
  AdminAuthorInfo,
  AdminPost,
  VisibilityChangeRequest,
  AdminComment,
  ForceLogoutResponse,
};
```

---

## 14. API 호출 함수 예시

```typescript
// src/api/adminApi.ts
import axiosInstance from './axiosInstance';
import type {
  ApiResponse, Page, DailyStats, DashboardStats,
  AdminUser, AdminUserDetail, StatusChangeRequest,
  RoleChangeRequest, ForceLogoutResponse,
  AdminPost, VisibilityChangeRequest,
  AdminComment, UserStatus, UserRole,
} from '../types/admin';

const ADMIN_BASE = '/api/admin';

// ===== 대시보드 =====

/** 대시보드 통계 조회 */
export const getDashboardStats = () =>
  axiosInstance.get<ApiResponse<DashboardStats>>(`${ADMIN_BASE}/dashboard/stats`);

/** 일별 통계 조회 (차트용 시계열 데이터) */
export const getDailyStats = (days: number = 30) =>
  axiosInstance.get<ApiResponse<DailyStats[]>>(`${ADMIN_BASE}/dashboard/daily-stats`, {
    params: { days },
  });

/** 최근 가입 사용자 조회 */
export const getRecentUsers = (limit: number = 10) =>
  axiosInstance.get<ApiResponse<AdminUser[]>>(`${ADMIN_BASE}/dashboard/recent-users`, {
    params: { limit },
  });

/** 최근 게시글 조회 */
export const getRecentPosts = (limit: number = 10) =>
  axiosInstance.get<ApiResponse<AdminPost[]>>(`${ADMIN_BASE}/dashboard/recent-posts`, {
    params: { limit },
  });

// ===== 사용자 관리 =====

/** 사용자 목록 조회 (필터링 + 페이징) */
export const getUsers = (params: {
  keyword?: string;
  status?: UserStatus;
  role?: UserRole;
  page?: number;
  size?: number;
}) =>
  axiosInstance.get<ApiResponse<Page<AdminUser>>>(`${ADMIN_BASE}/users`, { params });

/** 사용자 상세 조회 */
export const getUserDetail = (userId: number) =>
  axiosInstance.get<ApiResponse<AdminUserDetail>>(`${ADMIN_BASE}/users/${userId}`);

/** 사용자 상태 변경 */
export const changeUserStatus = (userId: number, data: StatusChangeRequest) =>
  axiosInstance.put<ApiResponse<null>>(`${ADMIN_BASE}/users/${userId}/status`, data);

/** 사용자 역할 변경 */
export const changeUserRole = (userId: number, data: RoleChangeRequest) =>
  axiosInstance.put<ApiResponse<null>>(`${ADMIN_BASE}/users/${userId}/role`, data);

/** 강제 로그아웃 */
export const forceLogout = (userId: number) =>
  axiosInstance.post<ApiResponse<ForceLogoutResponse>>(
    `${ADMIN_BASE}/users/${userId}/force-logout`
  );

// ===== 게시글 관리 =====

/** 게시글 목록 조회 (필터링 + 페이징) */
export const getPosts = (params: {
  keyword?: string;
  isDeleted?: boolean;
  page?: number;
  size?: number;
}) =>
  axiosInstance.get<ApiResponse<Page<AdminPost>>>(`${ADMIN_BASE}/posts`, { params });

/** 게시글 상세 조회 */
export const getPostDetail = (postId: number) =>
  axiosInstance.get<ApiResponse<AdminPost>>(`${ADMIN_BASE}/posts/${postId}`);

/** 게시글 삭제 (Soft Delete) */
export const deletePost = (postId: number) =>
  axiosInstance.delete<ApiResponse<null>>(`${ADMIN_BASE}/posts/${postId}`);

/** 게시글 복구 */
export const restorePost = (postId: number) =>
  axiosInstance.put<ApiResponse<null>>(`${ADMIN_BASE}/posts/${postId}/restore`);

/** 게시글 공개 범위 변경 */
export const changePostVisibility = (postId: number, data: VisibilityChangeRequest) =>
  axiosInstance.put<ApiResponse<null>>(`${ADMIN_BASE}/posts/${postId}/visibility`, data);

// ===== 댓글 관리 =====

/** 댓글 목록 조회 (필터링 + 페이징) */
export const getComments = (params: {
  keyword?: string;
  postId?: number;
  page?: number;
  size?: number;
}) =>
  axiosInstance.get<ApiResponse<Page<AdminComment>>>(`${ADMIN_BASE}/comments`, { params });

/** 댓글 삭제 (Soft Delete) */
export const deleteComment = (commentId: number) =>
  axiosInstance.delete<ApiResponse<null>>(`${ADMIN_BASE}/comments/${commentId}`);
```

---

## 15. 주요 컴포넌트 구현 가이드

### 15-1. 관리자 접근 제어 (라우트 가드)

```tsx
// src/components/admin/AdminGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>로딩 중...</div>;

  // 로그인하지 않은 경우 → 로그인 페이지로
  if (!user) return <Navigate to="/login" replace />;

  // 관리자 권한이 없는 경우 → 홈으로
  if (user.role !== 'ROLE_ADMIN') {
    alert('관리자 권한이 필요합니다.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
```

### 15-2. 상태 뱃지 컴포넌트

```tsx
// src/components/admin/StatusBadge.tsx
import type { UserStatus } from '../../types/admin';

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  ACTIVE:               { label: '활성',     color: '#22c55e' },  // 초록
  SUSPENDED:            { label: '정지',     color: '#ef4444' },  // 빨강
  DELETED:              { label: '삭제',     color: '#6b7280' },  // 회색
  INACTIVE:             { label: '비활성',   color: '#eab308' },  // 노랑
  PENDING_VERIFICATION: { label: '인증대기', color: '#3b82f6' },  // 파랑
};

interface StatusBadgeProps {
  status: UserStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status] || { label: status, color: '#6b7280' };

  return (
    <span
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
```

### 15-3. 확인 모달 (삭제/상태변경)

```tsx
// src/components/admin/ConfirmModal.tsx
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;         // 확인 버튼 텍스트 (기본: "확인")
  cancelText?: string;          // 취소 버튼 텍스트 (기본: "취소")
  danger?: boolean;             // 위험 작업 여부 (빨간 버튼)
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  isOpen, title, message,
  confirmText = '확인', cancelText = '취소',
  danger = false, onConfirm, onCancel,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        padding: '24px', maxWidth: '400px', width: '90%',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#666' }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', border: '1px solid #ddd',
            borderRadius: '4px', cursor: 'pointer',
          }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 16px', border: 'none', borderRadius: '4px',
            backgroundColor: danger ? '#ef4444' : '#3b82f6',
            color: 'white', cursor: 'pointer',
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
```

### 15-4. 페이지네이션 컴포넌트

```tsx
// src/components/admin/Pagination.tsx
interface PaginationProps {
  currentPage: number;    // 0-based (서버와 동일)
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  // 표시할 페이지 번호 범위 계산 (최대 5개)
  const startPage = Math.max(0, currentPage - 2);
  const endPage = Math.min(totalPages - 1, startPage + 4);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '16px' }}>
      <button
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ◀ 이전
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            fontWeight: page === currentPage ? 'bold' : 'normal',
            backgroundColor: page === currentPage ? '#3b82f6' : 'transparent',
            color: page === currentPage ? 'white' : 'inherit',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {page + 1}
        </button>
      ))}

      <button
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        다음 ▶
      </button>
    </div>
  );
};

export default Pagination;
```

### 15-5. 사용자 상세 페이지에서의 관리 액션 처리 패턴

```tsx
// 사용자 상세 페이지의 관리 액션 부분 예시
import { changeUserStatus, changeUserRole, forceLogout } from '../../api/adminApi';

// 상태 변경 핸들러
const handleStatusChange = async (userId: number, status: UserStatus, reason?: string) => {
  // 확인 모달 표시
  if (!confirm(`정말로 상태를 ${status}로 변경하시겠습니까?`)) return;

  try {
    await changeUserStatus(userId, { status, reason });
    alert('사용자 상태가 변경되었습니다.');
    // 사용자 정보 새로고침
    fetchUserDetail();
  } catch (error: any) {
    // 비즈니스 규칙 위반 시 서버 메시지 표시
    const message = error.response?.data?.message || '상태 변경에 실패했습니다.';
    alert(message);
  }
};

// 역할 변경 핸들러
const handleRoleChange = async (userId: number, role: UserRole) => {
  try {
    await changeUserRole(userId, { role });
    alert('사용자 역할이 변경되었습니다.');
    fetchUserDetail();
  } catch (error: any) {
    const message = error.response?.data?.message || '역할 변경에 실패했습니다.';
    alert(message);
  }
};

// 강제 로그아웃 핸들러
const handleForceLogout = async (userId: number) => {
  try {
    const response = await forceLogout(userId);
    const count = response.data.data?.revokedRefreshTokens || 0;
    alert(`강제 로그아웃 완료 (무효화된 토큰: ${count}개)`);
  } catch (error: any) {
    const message = error.response?.data?.message || '강제 로그아웃에 실패했습니다.';
    alert(message);
  }
};

// 슈퍼유저 보호: UI에서 버튼 비활성화
const isProtected = userDetail?.isSuperUser === true;
```

---

## 부록: curl 테스트 명령어

> 테스트 시 `ACCESS_TOKEN`을 실제 관리자 JWT 토큰으로 교체하세요.

```bash
# 변수 설정
TOKEN="eyJhbGciOiJIUzI1NiJ9..."
BASE="http://localhost:8080/api/admin"

# ===== 대시보드 =====

# 통계 조회
curl -s "$BASE/dashboard/stats" -H "Authorization: Bearer $TOKEN" | jq

# 일별 통계 (최근 30일, 차트용)
curl -s "$BASE/dashboard/daily-stats?days=30" -H "Authorization: Bearer $TOKEN" | jq

# 일별 통계 (최근 7일)
curl -s "$BASE/dashboard/daily-stats?days=7" -H "Authorization: Bearer $TOKEN" | jq

# 최근 가입 사용자
curl -s "$BASE/dashboard/recent-users?limit=5" -H "Authorization: Bearer $TOKEN" | jq

# 최근 게시글
curl -s "$BASE/dashboard/recent-posts?limit=5" -H "Authorization: Bearer $TOKEN" | jq

# ===== 사용자 관리 =====

# 사용자 목록 (필터링)
curl -s "$BASE/users?keyword=홍길동&status=ACTIVE&page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 사용자 상세
curl -s "$BASE/users/42" -H "Authorization: Bearer $TOKEN" | jq

# 사용자 상태 변경 (정지)
curl -s -X PUT "$BASE/users/42/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUSPENDED","reason":"스팸 게시글"}' | jq

# 사용자 역할 변경 (관리자로 승격)
curl -s -X PUT "$BASE/users/42/role" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"ROLE_ADMIN"}' | jq

# 강제 로그아웃
curl -s -X POST "$BASE/users/42/force-logout" \
  -H "Authorization: Bearer $TOKEN" | jq

# ===== 게시글 관리 =====

# 게시글 목록 (삭제된 것만)
curl -s "$BASE/posts?isDeleted=true&page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 게시글 상세
curl -s "$BASE/posts/150" -H "Authorization: Bearer $TOKEN" | jq

# 게시글 삭제
curl -s -X DELETE "$BASE/posts/150" \
  -H "Authorization: Bearer $TOKEN" | jq

# 게시글 복구
curl -s -X PUT "$BASE/posts/150/restore" \
  -H "Authorization: Bearer $TOKEN" | jq

# 게시글 공개 범위 변경
curl -s -X PUT "$BASE/posts/150/visibility" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visibility":"PRIVATE"}' | jq

# ===== 댓글 관리 =====

# 댓글 목록 (특정 게시글)
curl -s "$BASE/comments?postId=150&page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 댓글 삭제
curl -s -X DELETE "$BASE/comments/500" \
  -H "Authorization: Bearer $TOKEN" | jq
```
