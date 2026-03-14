# 어드민 관리자 페이지 백엔드 설계 문서

> 기존 SNS 백엔드(myauth)에 관리자 전용 API를 추가하여 사용자/게시글/댓글/시스템 관리 기능 제공

## 📋 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [어드민 기능 범위](#2-어드민-기능-범위)
3. [API 엔드포인트 설계](#3-api-엔드포인트-설계)
4. [보안 설계](#4-보안-설계)
5. [파일 구조](#5-파일-구조)
6. [DTO 상세](#6-dto-상세)
7. [서비스 상세](#7-서비스-상세)
8. [컨트롤러 상세](#8-컨트롤러-상세)
9. [기존 코드 수정 사항](#9-기존-코드-수정-사항)
10. [대시보드 통계 쿼리](#10-대시보드-통계-쿼리)
11. [구현 순서](#11-구현-순서)
12. [API 사용 예시](#12-api-사용-예시)

---

## 1. 현재 상태 분석

### 1.1 이미 준비된 것

| 항목 | 상태 | 설명 |
|------|------|------|
| `Role.ROLE_ADMIN` | 정의됨 | User 엔티티에 enum 값 존재 |
| `Role.ROLE_USER` | 정의됨 | 기본값으로 사용 중 |
| `Status` enum | 5가지 상태 | ACTIVE, DELETED, INACTIVE, PENDING_VERIFICATION, SUSPENDED |
| `isSuperUser` 필드 | 존재 | User 엔티티에 있으나 미활용 |
| `isActive` 필드 | 사용 중 | JWT 필터에서 비활성 계정 차단 |
| Post `softDelete()` | 구현됨 | `isDeleted` 플래그 방식 |
| Comment `softDelete()` | 구현됨 | `isDeleted` + 내용 대체 방식 |

### 1.2 신규 구현 필요

| 항목 | 설명 |
|------|------|
| SecurityConfig 수정 | `/api/admin/**` 경로에 `ROLE_ADMIN` 접근 제어 추가 |
| AdminController | 관리자 전용 API 컨트롤러 |
| AdminService | 관리자 비즈니스 로직 |
| Admin DTO | 관리자용 요청/응답 DTO |
| Repository 쿼리 추가 | 통계, 검색, 필터링 쿼리 |

---

## 2. 어드민 기능 범위

```
┌─────────────────────────────────────────────────────────┐
│                    어드민 관리 기능                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 대시보드 (Dashboard)                                 │
│     └── 전체 통계 (사용자 수, 게시글 수, 댓글 수 등)       │
│     └── 오늘/주간/월간 신규 가입자 수                     │
│     └── 오늘/주간/월간 신규 게시글 수                     │
│     └── 최근 가입 사용자 목록                             │
│     └── 최근 게시글 목록                                 │
│                                                         │
│  👤 사용자 관리 (User Management)                        │
│     └── 사용자 목록 조회 (검색, 필터, 페이징)             │
│     └── 사용자 상세 조회 (프로필, 활동 통계)              │
│     └── 사용자 상태 변경 (활성/정지/비활성/삭제)          │
│     └── 사용자 역할 변경 (USER ↔ ADMIN)                  │
│     └── 강제 로그아웃 (Refresh Token 전체 폐기)           │
│                                                         │
│  📝 게시글 관리 (Post Management)                        │
│     └── 게시글 목록 조회 (검색, 필터, 페이징)             │
│     └── 게시글 상세 조회                                 │
│     └── 게시글 강제 삭제 (Soft Delete)                    │
│     └── 삭제된 게시글 복구                               │
│     └── 게시글 공개 범위 강제 변경                        │
│                                                         │
│  💬 댓글 관리 (Comment Management)                       │
│     └── 댓글 목록 조회 (검색, 필터, 페이징)              │
│     └── 댓글 강제 삭제 (Soft Delete)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. API 엔드포인트 설계

모든 어드민 API는 **`/api/admin`** 접두사를 사용하며, `ROLE_ADMIN` 권한 필요.

### 3.1 대시보드

| HTTP | URL | 설명 |
|------|-----|------|
| GET | `/api/admin/dashboard/stats` | 전체 통계 (사용자/게시글/댓글 수) |
| GET | `/api/admin/dashboard/recent-users` | 최근 가입 사용자 (10명) |
| GET | `/api/admin/dashboard/recent-posts` | 최근 게시글 (10개) |

### 3.2 사용자 관리

| HTTP | URL | 설명 |
|------|-----|------|
| GET | `/api/admin/users` | 사용자 목록 (검색, 필터, 페이징) |
| GET | `/api/admin/users/{userId}` | 사용자 상세 (프로필 + 활동 통계) |
| PUT | `/api/admin/users/{userId}/status` | 사용자 상태 변경 |
| PUT | `/api/admin/users/{userId}/role` | 사용자 역할 변경 |
| POST | `/api/admin/users/{userId}/force-logout` | 강제 로그아웃 |

### 3.3 게시글 관리

| HTTP | URL | 설명 |
|------|-----|------|
| GET | `/api/admin/posts` | 게시글 목록 (검색, 필터, 페이징, 삭제된 것 포함) |
| GET | `/api/admin/posts/{postId}` | 게시글 상세 |
| DELETE | `/api/admin/posts/{postId}` | 게시글 강제 삭제 (Soft Delete) |
| PUT | `/api/admin/posts/{postId}/restore` | 삭제된 게시글 복구 |
| PUT | `/api/admin/posts/{postId}/visibility` | 공개 범위 강제 변경 |

### 3.4 댓글 관리

| HTTP | URL | 설명 |
|------|-----|------|
| GET | `/api/admin/comments` | 댓글 목록 (검색, 필터, 페이징) |
| DELETE | `/api/admin/comments/{commentId}` | 댓글 강제 삭제 (Soft Delete) |

---

## 4. 보안 설계

### 4.1 SecurityConfig 수정

```java
.authorizeHttpRequests(auth -> auth
    // 기존 permitAll 경로들...

    // 어드민 전용 경로 — ROLE_ADMIN 권한 필요
    .requestMatchers("/api/admin/**").hasRole("ADMIN")

    // 그 외 모든 요청은 인증 필요
    .anyRequest().authenticated()
)
```

**중요:** Spring Security의 `hasRole("ADMIN")`은 내부적으로 `ROLE_` 접두사를 자동 추가하여 `ROLE_ADMIN`과 매칭합니다.

### 4.2 접근 제어 흐름

```
1. 클라이언트 → /api/admin/** 요청
2. JwtAuthenticationFilter → JWT 토큰 검증
3. SecurityContext에 User 설정 (role 포함)
4. SecurityFilterChain → hasRole("ADMIN") 체크
5. ROLE_USER인 경우 → 403 Forbidden 자동 반환
6. ROLE_ADMIN인 경우 → Controller 진입
```

### 4.3 403 에러 응답 처리

Spring Security의 기본 403 응답 대신 `ApiResponse` 형식으로 반환하기 위해 `AccessDeniedHandler`를 추가합니다.

```java
// SecurityConfig에 추가
.exceptionHandling(ex -> ex
    .accessDeniedHandler((request, response, accessDeniedException) -> {
        response.setStatus(403);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"success\":false,\"message\":\"관리자 권한이 필요합니다.\",\"data\":null}"
        );
    })
)
```

---

## 5. 파일 구조

### 5.1 신규 생성 파일 (10개)

```
src/main/java/com/example/myauth/
│
├── dto/admin/
│   ├── AdminDashboardStatsResponse.java    ← 대시보드 통계
│   ├── AdminUserListResponse.java          ← 사용자 목록 항목
│   ├── AdminUserDetailResponse.java        ← 사용자 상세 (활동 통계 포함)
│   ├── AdminStatusChangeRequest.java       ← 상태 변경 요청
│   ├── AdminRoleChangeRequest.java         ← 역할 변경 요청
│   ├── AdminPostListResponse.java          ← 게시글 목록 항목
│   ├── AdminCommentListResponse.java       ← 댓글 목록 항목
│   └── AdminVisibilityChangeRequest.java   ← 공개 범위 변경 요청
│
├── service/
│   └── AdminService.java                   ← 관리자 비즈니스 로직
│
└── controller/
    └── AdminController.java                ← 관리자 API 컨트롤러
```

### 5.2 수정 파일 (3개)

```
├── config/SecurityConfig.java     ← /api/admin/** hasRole("ADMIN") 추가
├── repository/PostRepository.java ← 관리자용 쿼리 추가 (삭제 포함 전체 조회)
└── repository/UserRepository.java ← 관리자용 검색/필터 쿼리 추가
```

---

## 6. DTO 상세

### 6.1 AdminDashboardStatsResponse (대시보드 통계)

```json
{
  "totalUsers": 1250,
  "activeUsers": 1100,
  "suspendedUsers": 30,
  "totalPosts": 5400,
  "totalComments": 12000,
  "totalDmRooms": 800,
  "todayNewUsers": 15,
  "todayNewPosts": 42,
  "weeklyNewUsers": 85,
  "weeklyNewPosts": 230
}
```

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminDashboardStatsResponse {
    private long totalUsers;         // 전체 사용자 수
    private long activeUsers;        // 활성 사용자 수
    private long suspendedUsers;     // 정지된 사용자 수
    private long totalPosts;         // 전체 게시글 수 (삭제 제외)
    private long totalComments;      // 전체 댓글 수 (삭제 제외)
    private long totalDmRooms;       // 전체 DM 채팅방 수
    private long todayNewUsers;      // 오늘 신규 가입자
    private long todayNewPosts;      // 오늘 신규 게시글
    private long weeklyNewUsers;     // 이번 주 신규 가입자
    private long weeklyNewPosts;     // 이번 주 신규 게시글
}
```

### 6.2 AdminUserListResponse (사용자 목록)

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "홍길동",
  "profileImage": "http://...",
  "role": "ROLE_USER",
  "status": "ACTIVE",
  "isActive": true,
  "provider": "LOCAL",
  "postCount": 15,
  "followerCount": 120,
  "createdAt": "2026-01-15T10:00:00",
  "lastLoginAt": "2026-03-14T09:30:00"
}
```

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminUserListResponse {
    private Long id;
    private String email;
    private String name;
    private String profileImage;
    private String role;              // ROLE_ADMIN / ROLE_USER
    private String status;            // ACTIVE / SUSPENDED / DELETED 등
    private Boolean isActive;
    private String provider;          // LOCAL / KAKAO
    private long postCount;           // 게시글 수
    private long followerCount;       // 팔로워 수
    private LocalDateTime createdAt;  // 가입일
    private LocalDateTime lastLoginAt; // 마지막 로그인
}
```

### 6.3 AdminUserDetailResponse (사용자 상세)

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "홍길동",
  "profileImage": "http://...",
  "role": "ROLE_USER",
  "status": "ACTIVE",
  "isActive": true,
  "isSuperUser": false,
  "provider": "LOCAL",
  "createdAt": "2026-01-15T10:00:00",
  "lastLoginAt": "2026-03-14T09:30:00",
  "failedLoginAttempts": 0,
  "profile": {
    "lastName": "홍",
    "firstName": "길동",
    "phoneNumber": "010-1234-5678",
    "birth": "1990-01-01T00:00:00"
  },
  "stats": {
    "postCount": 15,
    "commentCount": 42,
    "likeCount": 230,
    "followerCount": 120,
    "followingCount": 85,
    "bookmarkCount": 30
  }
}
```

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminUserDetailResponse {
    private Long id;
    private String email;
    private String name;
    private String profileImage;
    private String role;
    private String status;
    private Boolean isActive;
    private Boolean isSuperUser;
    private String provider;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private Integer failedLoginAttempts;

    private ProfileInfo profile;       // 프로필 상세
    private UserActivityStats stats;   // 활동 통계

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfileInfo {
        private String lastName;
        private String firstName;
        private String phoneNumber;
        private LocalDateTime birth;
        private String bgImage;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserActivityStats {
        private long postCount;        // 작성 게시글 수
        private long commentCount;     // 작성 댓글 수
        private long likeCount;        // 좋아요 누른 수
        private long followerCount;    // 팔로워 수
        private long followingCount;   // 팔로잉 수
        private long bookmarkCount;    // 북마크 수
    }
}
```

### 6.4 요청 DTO

#### AdminStatusChangeRequest
```java
@Data @NoArgsConstructor @AllArgsConstructor
public class AdminStatusChangeRequest {
    @NotNull(message = "변경할 상태는 필수입니다")
    private User.Status status;  // ACTIVE, SUSPENDED, INACTIVE, DELETED

    private String reason;       // 변경 사유 (선택)
}
```

#### AdminRoleChangeRequest
```java
@Data @NoArgsConstructor @AllArgsConstructor
public class AdminRoleChangeRequest {
    @NotNull(message = "변경할 역할은 필수입니다")
    private User.Role role;  // ROLE_ADMIN, ROLE_USER
}
```

#### AdminVisibilityChangeRequest
```java
@Data @NoArgsConstructor @AllArgsConstructor
public class AdminVisibilityChangeRequest {
    @NotNull(message = "변경할 공개 범위는 필수입니다")
    private Visibility visibility;  // PUBLIC, PRIVATE, FOLLOWERS
}
```

### 6.5 AdminPostListResponse (게시글 목록)

```json
{
  "id": 100,
  "content": "오늘 날씨가 좋네요...",
  "visibility": "PUBLIC",
  "likeCount": 15,
  "commentCount": 3,
  "viewCount": 120,
  "isDeleted": false,
  "author": {
    "id": 1,
    "name": "홍길동",
    "email": "user@example.com"
  },
  "imageCount": 2,
  "createdAt": "2026-03-10T14:30:00"
}
```

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminPostListResponse {
    private Long id;
    private String content;           // 200자 미리보기
    private String visibility;
    private Integer likeCount;
    private Integer commentCount;
    private Integer viewCount;
    private Boolean isDeleted;        // 삭제 여부 (관리자만 볼 수 있음)
    private AdminAuthorInfo author;   // 작성자 정보
    private Integer imageCount;
    private LocalDateTime createdAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AdminAuthorInfo {
        private Long id;
        private String name;
        private String email;         // 관리자용 — 이메일 포함
    }
}
```

### 6.6 AdminCommentListResponse (댓글 목록)

```json
{
  "id": 500,
  "content": "좋은 글이네요!",
  "postId": 100,
  "postContentPreview": "오늘 날씨가 좋네요...",
  "author": {
    "id": 1,
    "name": "홍길동",
    "email": "user@example.com"
  },
  "parentId": null,
  "likeCount": 5,
  "isDeleted": false,
  "createdAt": "2026-03-10T15:00:00"
}
```

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminCommentListResponse {
    private Long id;
    private String content;
    private Long postId;
    private String postContentPreview;   // 소속 게시글 내용 미리보기 (50자)
    private AdminPostListResponse.AdminAuthorInfo author;
    private Long parentId;               // 대댓글이면 부모 댓글 ID
    private Integer likeCount;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
}
```

---

## 7. 서비스 상세

### 7.1 AdminService

```java
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final FollowRepository followRepository;
    private final BookmarkRepository bookmarkRepository;
    private final DmRoomRepository dmRoomRepository;
    private final RefreshTokenRepository refreshTokenRepository;
```

**메서드 목록:**

| 메서드 | 설명 | 트랜잭션 |
|--------|------|---------|
| `getDashboardStats()` | 대시보드 통계 조회 | readOnly |
| `getRecentUsers(int limit)` | 최근 가입 사용자 | readOnly |
| `getRecentPosts(int limit)` | 최근 게시글 | readOnly |
| `getUsers(String keyword, Status status, Role role, Pageable)` | 사용자 목록 (검색/필터) | readOnly |
| `getUserDetail(Long userId)` | 사용자 상세 + 활동 통계 | readOnly |
| `changeUserStatus(Long userId, Status status)` | 사용자 상태 변경 | `@Transactional` |
| `changeUserRole(Long userId, Role role)` | 사용자 역할 변경 | `@Transactional` |
| `forceLogout(Long userId)` | 강제 로그아웃 (RT 폐기) | `@Transactional` |
| `getPosts(String keyword, Boolean isDeleted, Pageable)` | 게시글 목록 (삭제 포함) | readOnly |
| `getPostDetail(Long postId)` | 게시글 상세 | readOnly |
| `deletePost(Long postId)` | 게시글 강제 삭제 | `@Transactional` |
| `restorePost(Long postId)` | 게시글 복구 | `@Transactional` |
| `changePostVisibility(Long postId, Visibility)` | 공개 범위 변경 | `@Transactional` |
| `getComments(String keyword, Long postId, Pageable)` | 댓글 목록 | readOnly |
| `deleteComment(Long commentId)` | 댓글 강제 삭제 | `@Transactional` |

### 7.2 주요 비즈니스 로직

#### getDashboardStats

```
1. 전체 사용자 수: userRepository.count()
2. 활성 사용자 수: userRepository.countByStatus(ACTIVE)
3. 정지된 사용자 수: userRepository.countByStatus(SUSPENDED)
4. 전체 게시글 수: postRepository.countByIsDeletedFalse()
5. 전체 댓글 수: commentRepository.countByIsDeletedFalse()
6. 전체 DM 채팅방 수: dmRoomRepository.count()
7. 오늘 신규 가입자: userRepository.countByCreatedAtAfter(오늘 00:00)
8. 오늘 신규 게시글: postRepository.countByCreatedAtAfterAndIsDeletedFalse(오늘 00:00)
9. 이번 주 신규 가입자: userRepository.countByCreatedAtAfter(이번주 월요일)
10. 이번 주 신규 게시글: postRepository.countByCreatedAtAfterAndIsDeletedFalse(이번주 월요일)
```

#### changeUserStatus

```
1. userId로 User 조회 → 없으면 UserNotFoundException
2. 자기 자신의 상태 변경 방지 체크
3. user.setStatus(newStatus)
4. SUSPENDED/DELETED이면 user.setIsActive(false) → JWT 필터에서 차단됨
5. ACTIVE이면 user.setIsActive(true) 복원
6. 저장
```

#### forceLogout

```
1. userId로 User 조회 → 없으면 UserNotFoundException
2. refreshTokenRepository.revokeAllByUser(userId)
   → 해당 사용자의 모든 Refresh Token을 isRevoked=true로 변경
3. 사용자의 Access Token은 만료될 때까지 유효하나, Refresh 불가
   → 결과적으로 최대 1시간 후 완전 로그아웃
```

#### deletePost (관리자 강제 삭제)

```
1. postId로 Post 조회 (isDeleted 무관) → 없으면 PostNotFoundException
2. 이미 삭제된 게시글이면 예외
3. post.softDelete() → isDeleted = true
4. 저장
```

#### restorePost (삭제된 게시글 복구)

```
1. postId로 Post 조회 (삭제된 것 포함) → 없으면 PostNotFoundException
2. 삭제되지 않은 게시글이면 예외
3. post.setIsDeleted(false) → 복구
4. 저장
```

---

## 8. 컨트롤러 상세

### 8.1 AdminController

```java
@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;
```

**엔드포인트 매핑:**

| 메서드 | HTTP | URL | 쿼리 파라미터 |
|--------|------|-----|-------------|
| `getDashboardStats()` | GET | `/dashboard/stats` | - |
| `getRecentUsers()` | GET | `/dashboard/recent-users` | `?limit=10` |
| `getRecentPosts()` | GET | `/dashboard/recent-posts` | `?limit=10` |
| `getUsers()` | GET | `/users` | `?keyword=&status=&role=&page=0&size=20` |
| `getUserDetail()` | GET | `/users/{userId}` | - |
| `changeUserStatus()` | PUT | `/users/{userId}/status` | Body: `{status, reason}` |
| `changeUserRole()` | PUT | `/users/{userId}/role` | Body: `{role}` |
| `forceLogout()` | POST | `/users/{userId}/force-logout` | - |
| `getPosts()` | GET | `/posts` | `?keyword=&isDeleted=&page=0&size=20` |
| `getPostDetail()` | GET | `/posts/{postId}` | - |
| `deletePost()` | DELETE | `/posts/{postId}` | - |
| `restorePost()` | PUT | `/posts/{postId}/restore` | - |
| `changePostVisibility()` | PUT | `/posts/{postId}/visibility` | Body: `{visibility}` |
| `getComments()` | GET | `/comments` | `?keyword=&postId=&page=0&size=20` |
| `deleteComment()` | DELETE | `/comments/{commentId}` | - |

### 8.2 검색/필터 파라미터 상세

#### 사용자 목록 (`GET /api/admin/users`)

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `keyword` | String | null | 이메일 또는 이름으로 검색 (LIKE 매칭) |
| `status` | String | null | 상태 필터 (ACTIVE, SUSPENDED, DELETED 등) |
| `role` | String | null | 역할 필터 (ROLE_ADMIN, ROLE_USER) |
| `page` | int | 0 | 페이지 번호 |
| `size` | int | 20 | 페이지 크기 (최대 50) |

#### 게시글 목록 (`GET /api/admin/posts`)

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `keyword` | String | null | 게시글 내용 또는 작성자명으로 검색 |
| `isDeleted` | Boolean | null | 삭제 여부 필터 (null: 전체, true: 삭제된 것만, false: 삭제 안 된 것만) |
| `page` | int | 0 | 페이지 번호 |
| `size` | int | 20 | 페이지 크기 (최대 50) |

#### 댓글 목록 (`GET /api/admin/comments`)

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|-------|------|
| `keyword` | String | null | 댓글 내용 또는 작성자명으로 검색 |
| `postId` | Long | null | 특정 게시글의 댓글만 필터 |
| `page` | int | 0 | 페이지 번호 |
| `size` | int | 20 | 페이지 크기 (최대 50) |

---

## 9. 기존 코드 수정 사항

### 9.1 SecurityConfig.java

```java
// 변경 전
.anyRequest().authenticated()

// 변경 후
.requestMatchers("/api/admin/**").hasRole("ADMIN")
.anyRequest().authenticated()

// AccessDeniedHandler 추가 (403 JSON 응답)
.exceptionHandling(ex -> ex
    .accessDeniedHandler((request, response, accessDeniedException) -> {
        response.setStatus(403);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"success\":false,\"message\":\"관리자 권한이 필요합니다.\",\"data\":null}"
        );
    })
)
```

### 9.2 UserRepository.java (쿼리 추가)

```java
// 상태별 사용자 수 카운트
long countByStatus(User.Status status);

// 특정 시점 이후 가입자 수
long countByCreatedAtAfter(LocalDateTime dateTime);

// 관리자용 사용자 검색 (이메일 또는 이름 LIKE + 상태/역할 필터)
@Query("SELECT u FROM User u WHERE " +
       "(:keyword IS NULL OR u.email LIKE %:keyword% OR u.name LIKE %:keyword%) AND " +
       "(:status IS NULL OR u.status = :status) AND " +
       "(:role IS NULL OR u.role = :role) " +
       "ORDER BY u.createdAt DESC")
Page<User> findByAdminFilter(
    @Param("keyword") String keyword,
    @Param("status") User.Status status,
    @Param("role") User.Role role,
    Pageable pageable
);

// 최근 가입 사용자 (N명)
List<User> findTopNByOrderByCreatedAtDesc(Pageable pageable);
```

### 9.3 PostRepository.java (쿼리 추가)

```java
// 삭제 안 된 게시글 수
long countByIsDeletedFalse();

// 특정 시점 이후 게시글 수
long countByCreatedAtAfterAndIsDeletedFalse(LocalDateTime dateTime);

// 관리자용 게시글 검색 (삭제된 것 포함, 내용/작성자 검색)
@Query("SELECT p FROM Post p JOIN FETCH p.user WHERE " +
       "(:keyword IS NULL OR p.content LIKE %:keyword% OR p.user.name LIKE %:keyword%) AND " +
       "(:isDeleted IS NULL OR p.isDeleted = :isDeleted) " +
       "ORDER BY p.createdAt DESC")
Page<Post> findByAdminFilter(
    @Param("keyword") String keyword,
    @Param("isDeleted") Boolean isDeleted,
    Pageable pageable
);

// 관리자용 게시글 상세 조회 (삭제된 것도 조회 가능)
@Query("SELECT p FROM Post p JOIN FETCH p.user LEFT JOIN FETCH p.images WHERE p.id = :postId")
Optional<Post> findByIdForAdmin(@Param("postId") Long postId);

// 특정 사용자의 게시글 수
long countByUserIdAndIsDeletedFalse(Long userId);
```

### 9.4 CommentRepository.java (쿼리 추가)

```java
// 삭제 안 된 댓글 수
long countByIsDeletedFalse();

// 특정 사용자의 댓글 수
long countByUserIdAndIsDeletedFalse(Long userId);

// 관리자용 댓글 검색
@Query("SELECT c FROM Comment c JOIN FETCH c.user JOIN FETCH c.post WHERE " +
       "(:keyword IS NULL OR c.content LIKE %:keyword% OR c.user.name LIKE %:keyword%) AND " +
       "(:postId IS NULL OR c.post.id = :postId) " +
       "ORDER BY c.createdAt DESC")
Page<Comment> findByAdminFilter(
    @Param("keyword") String keyword,
    @Param("postId") Long postId,
    Pageable pageable
);
```

### 9.5 Post 엔티티 (복구 메서드 추가)

```java
// 기존 softDelete()에 대응하는 복구 메서드
public void restore() {
    this.isDeleted = false;
}
```

---

## 10. 대시보드 통계 쿼리

```sql
-- 전체 사용자 수
SELECT COUNT(*) FROM users;

-- 활성 사용자 수
SELECT COUNT(*) FROM users WHERE status = 'ACTIVE';

-- 정지된 사용자 수
SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED';

-- 전체 게시글 수 (삭제 제외)
SELECT COUNT(*) FROM posts WHERE is_deleted = false;

-- 전체 댓글 수 (삭제 제외)
SELECT COUNT(*) FROM comments WHERE is_deleted = false;

-- 전체 DM 채팅방 수
SELECT COUNT(*) FROM dm_rooms;

-- 오늘 신규 가입자
SELECT COUNT(*) FROM users WHERE created_at >= CURDATE();

-- 오늘 신규 게시글
SELECT COUNT(*) FROM posts WHERE created_at >= CURDATE() AND is_deleted = false;

-- 이번 주 신규 가입자
SELECT COUNT(*) FROM users
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY);

-- 이번 주 신규 게시글
SELECT COUNT(*) FROM posts
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
AND is_deleted = false;
```

---

## 11. 구현 순서

```
Step 1: SecurityConfig 수정
  └── /api/admin/** hasRole("ADMIN") 추가
  └── AccessDeniedHandler 추가 (403 JSON 응답)

Step 2: Repository 쿼리 추가
  └── UserRepository — countByStatus, 검색 쿼리
  └── PostRepository — 관리자용 검색 쿼리 (삭제 포함)
  └── CommentRepository — 관리자용 검색 쿼리

Step 3: Post 엔티티 수정
  └── restore() 메서드 추가

Step 4: DTO 생성 (8개)
  └── AdminDashboardStatsResponse
  └── AdminUserListResponse
  └── AdminUserDetailResponse
  └── AdminStatusChangeRequest
  └── AdminRoleChangeRequest
  └── AdminPostListResponse
  └── AdminCommentListResponse
  └── AdminVisibilityChangeRequest

Step 5: AdminService 생성
  └── 15개 비즈니스 메서드

Step 6: AdminController 생성
  └── 15개 API 엔드포인트

Step 7: 테스트
  └── ROLE_ADMIN 사용자 생성 (DB 직접 UPDATE)
  └── 어드민 API 호출 테스트
  └── ROLE_USER로 접근 시 403 확인
```

---

## 12. API 사용 예시

### 12.1 관리자 계정 준비

```sql
-- 기존 사용자를 관리자로 승격 (DB에서 직접)
UPDATE users SET role = 'ROLE_ADMIN' WHERE email = 'admin@example.com';
```

### 12.2 API 호출 예시

```bash
# 관리자 로그인
ADMIN_TOKEN=$(curl -s -X POST http://localhost:9080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.data.accessToken')

# 1. 대시보드 통계
curl http://localhost:9080/api/admin/dashboard/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. 최근 가입 사용자
curl "http://localhost:9080/api/admin/dashboard/recent-users?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. 사용자 목록 (정지된 사용자만)
curl "http://localhost:9080/api/admin/users?status=SUSPENDED&page=0&size=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. 사용자 검색
curl "http://localhost:9080/api/admin/users?keyword=홍길동" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. 사용자 상세 조회
curl http://localhost:9080/api/admin/users/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 6. 사용자 정지
curl -X PUT http://localhost:9080/api/admin/users/5/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUSPENDED","reason":"부적절한 게시물 반복 등록"}'

# 7. 사용자 정지 해제
curl -X PUT http://localhost:9080/api/admin/users/5/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}'

# 8. 사용자 역할 변경 (관리자 승격)
curl -X PUT http://localhost:9080/api/admin/users/3/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"ROLE_ADMIN"}'

# 9. 강제 로그아웃
curl -X POST http://localhost:9080/api/admin/users/5/force-logout \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 10. 게시글 목록 (삭제된 것만)
curl "http://localhost:9080/api/admin/posts?isDeleted=true&page=0&size=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 11. 게시글 강제 삭제
curl -X DELETE http://localhost:9080/api/admin/posts/100 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 12. 삭제된 게시글 복구
curl -X PUT http://localhost:9080/api/admin/posts/100/restore \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 13. 게시글 공개 범위 변경 (비공개로)
curl -X PUT http://localhost:9080/api/admin/posts/100/visibility \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visibility":"PRIVATE"}'

# 14. 댓글 목록 (특정 게시글)
curl "http://localhost:9080/api/admin/comments?postId=100&page=0&size=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 15. 댓글 강제 삭제
curl -X DELETE http://localhost:9080/api/admin/comments/500 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# === 권한 테스트 ===

# 일반 사용자로 어드민 API 접근 시 403
USER_TOKEN=$(curl -s -X POST http://localhost:9080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.data.accessToken')

curl http://localhost:9080/api/admin/dashboard/stats \
  -H "Authorization: Bearer $USER_TOKEN"
# → {"success":false,"message":"관리자 권한이 필요합니다.","data":null}
```

### 12.3 프론트엔드 어드민 페이지 구조 (참고)

```
/admin
  ├── /admin/dashboard          ← 대시보드 (통계, 최근 활동)
  ├── /admin/users              ← 사용자 목록 (검색, 필터, 페이징)
  ├── /admin/users/:id          ← 사용자 상세 (프로필, 활동 통계, 상태/역할 변경)
  ├── /admin/posts              ← 게시글 목록 (검색, 삭제 필터)
  ├── /admin/posts/:id          ← 게시글 상세 (삭제/복구/공개 범위 변경)
  └── /admin/comments           ← 댓글 목록 (검색, 게시글 필터)
```
