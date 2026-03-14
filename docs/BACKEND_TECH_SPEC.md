# 백엔드 기술 스펙 문서

> myauth — 인스타그램 스타일 SNS 백엔드 (Spring Boot 4 + JWT + MySQL)

## 📋 목차

1. [기술 스택 요약](#1-기술-스택-요약)
2. [프레임워크 및 의존성](#2-프레임워크-및-의존성)
3. [아키텍처 개요](#3-아키텍처-개요)
4. [인증 및 보안](#4-인증-및-보안)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [API 엔드포인트 전체 목록](#6-api-엔드포인트-전체-목록)
7. [레이어별 파일 구조](#7-레이어별-파일-구조)
8. [환경 설정](#8-환경-설정)
9. [인프라 및 배포](#9-인프라-및-배포)
10. [주요 설계 패턴](#10-주요-설계-패턴)

---

## 1. 기술 스택 요약

| 구분 | 기술 | 버전 |
|------|------|------|
| **언어** | Java | 17 (LTS) |
| **프레임워크** | Spring Boot | 4.0.0 |
| **보안** | Spring Security | 7.x (Stateless JWT) |
| **ORM** | Spring Data JPA / Hibernate | 7.x |
| **데이터베이스** | MySQL | 8.0 |
| **JWT** | jjwt (io.jsonwebtoken) | 0.12.5 |
| **빌드** | Gradle | 9.x |
| **JSON** | Jackson 3 | `tools.jackson` 패키지 |
| **유틸리티** | Lombok | - |
| **검증** | Bean Validation (Jakarta) | - |
| **컨테이너** | Docker (Amazon Corretto 17 Alpine) | - |
| **CI/CD** | GitHub Actions → AWS Lightsail | - |
| **레지스트리** | GHCR (GitHub Container Registry) | - |
| **리버스 프록시** | Nginx | 서버 직접 설치 |

---

## 2. 프레임워크 및 의존성

### 2.1 build.gradle 핵심 설정

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '4.0.0'
    id 'io.spring.dependency-management' version '1.1.7'
}

java {
    toolchain { languageVersion = JavaLanguageVersion.of(17) }
}
```

### 2.2 주요 의존성

| 의존성 | 설명 |
|--------|------|
| `spring-boot-starter-web` | REST API, 내장 Tomcat, Jackson 3 |
| `spring-boot-starter-security` | 인증/인가, 필터 체인 |
| `spring-boot-starter-data-jpa` | JPA/Hibernate ORM |
| `spring-boot-starter-validation` | Bean Validation (`@Valid`, `@NotBlank` 등) |
| `jjwt-api` / `jjwt-impl` / `jjwt-jackson` (0.12.5) | JWT 토큰 생성/검증 |
| `mysql-connector-j` | MySQL JDBC 드라이버 |
| `lombok` | 보일러플레이트 코드 제거 (`@Getter`, `@Builder` 등) |
| `spring-boot-devtools` | 개발 환경 자동 재시작 |

### 2.3 Spring Boot 4 특이사항

- **Jackson 3**: 패키지가 `com.fasterxml.jackson` → `tools.jackson`으로 변경
- **Jakarta EE**: `javax` → `jakarta` 네임스페이스

---

## 3. 아키텍처 개요

### 3.1 전체 요청 흐름

```
클라이언트 (웹 브라우저 / 모바일 앱)
    │
    ▼
┌───────────┐
│  Nginx    │  ← 프로덕션: 80/443 → 내부 8080(Docker) → 9080(Spring)
└─────┬─────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│          JwtAuthenticationFilter            │  ← OncePerRequestFilter
│  (Authorization: Bearer {token} 검증)       │
└─────┬───────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│           SecurityFilterChain               │
│  ├── permitAll: /api/signup, /api/login ... │
│  └── authenticated: 그 외 모든 요청          │
└─────┬───────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│              Controller                      │
│  (@AuthenticationPrincipal User user)       │
└─────┬───────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│              Service                         │
│  (@Transactional / @Transactional(readOnly))│
└─────┬───────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│            Repository (JPA)                  │
│  (Spring Data JPA + JPQL @Query)            │
└─────┬───────────────────────────────────────┘
      │
      ▼
┌─────────────┐     ┌──────────────────┐
│   MySQL 8   │     │  로컬 파일시스템   │
│  (mannal)   │     │  (./uploads)      │
└─────────────┘     └──────────────────┘
```

### 3.2 레이어 구조

```
Controller  →  요청/응답 처리, 입력 검증 (@Valid)
    │
Service     →  비즈니스 로직, 트랜잭션 관리
    │
Repository  →  데이터 접근, JPQL 쿼리
    │
Entity      →  DB 테이블 매핑, 도메인 모델
```

### 3.3 클라이언트 타입 감지

`ClientTypeDetector` 유틸리티로 웹/모바일을 자동 구분:

| 감지 기준 | 클라이언트 |
|----------|-----------|
| `X-Client-Type: mobile` 헤더 | 모바일 |
| User-Agent: OkHttp, CFNetwork, Flutter, React Native, Dart | 모바일 |
| 그 외 (Chrome, Firefox, Safari 등) | 웹 |

**토큰 전송 방식 분기:**
- **웹**: Refresh Token → HTTP-only 쿠키 / Access Token → JSON 바디
- **모바일**: 모든 토큰 → JSON 바디

---

## 4. 인증 및 보안

### 4.1 JWT 토큰 전략

| 토큰 | 유효기간 | 저장 위치 (웹) | 저장 위치 (모바일) |
|------|---------|---------------|------------------|
| Access Token | 1시간 (3,600,000ms) | 메모리 (JS 변수) | SecureStorage |
| Refresh Token | 7일 (604,800,000ms) | HTTP-only 쿠키 | SecureStorage |

### 4.2 JWT 토큰 구조

```
Access Token Claims:
  ├── sub: 사용자 이메일
  ├── userId: 사용자 ID
  ├── type: "access"
  └── exp: 만료시간

Refresh Token Claims:
  ├── sub: 사용자 이메일
  ├── type: "refresh"
  └── exp: 만료시간
```

**서명 알고리즘:** HMAC-SHA (Base64 인코딩된 secret key)

### 4.3 Spring Security 설정

```
인증 불필요 (permitAll):
  ├── GET  /health, /api/health
  ├── POST /api/signup, /api/login, /api/old_login, /api/refresh
  ├── GET  /api/auth/kakao/**
  └── GET  /uploads/**

인증 필요 (authenticated):
  └── 그 외 모든 요청

비활성화:
  ├── CSRF (Stateless API)
  ├── FormLogin
  ├── HttpBasic
  └── 세션 (SessionCreationPolicy.STATELESS)
```

### 4.4 JWT 인증 필터 (JwtAuthenticationFilter)

```
1. Authorization: Bearer {token} 헤더에서 토큰 추출
2. JwtTokenProvider.validateToken()으로 검증
3. 토큰에서 userId 추출 → DB에서 User 조회
4. User.isActive 확인 → 비활성 계정이면 401
5. SecurityContextHolder에 Authentication 설정
```

**에러 응답:**

| 상황 | errorCode | action | HTTP |
|------|-----------|--------|------|
| 토큰 만료 | `TOKEN_EXPIRED` | `REFRESH_TOKEN` | 401 |
| 토큰 유효하지 않음 | `INVALID_TOKEN` | `LOGIN_REQUIRED` | 401 |
| 토큰 없음 | `NO_TOKEN` | `LOGIN_REQUIRED` | 401 |

### 4.5 Refresh Token DB 관리

```
refresh_tokens 테이블:
  ├── token (VARCHAR, UNIQUE)
  ├── user_id (FK → users)
  ├── is_revoked (BOOLEAN, 기본 false)
  ├── expires_at (TIMESTAMP)
  └── created_at (TIMESTAMP)
```

- 로그인 시 새 Refresh Token 발급 및 DB 저장
- 토큰 갱신 시 기존 토큰 폐기 + 새 토큰 발급
- 로그아웃 시 해당 사용자의 모든 Refresh Token 폐기

### 4.6 쿠키 설정 (웹 클라이언트)

```
refreshToken 쿠키:
  ├── HttpOnly: true      ← JavaScript 접근 불가 (XSS 방어)
  ├── Secure: false/true  ← 환경별 설정 (개발: false, HTTPS: true)
  ├── Path: /             ← 모든 경로
  ├── MaxAge: 7일
  ├── SameSite: Lax       ← CSRF 방어
  └── Domain: 환경별      ← 개발: "localhost", 프로덕션 IP: 생략
```

### 4.7 카카오 OAuth 2.0

```
1. GET  /api/auth/kakao/login
   → 카카오 인가 페이지로 리다이렉트

2. GET  /api/auth/kakao/callback?code=AUTH_CODE
   → Authorization Code로 카카오 Access Token 요청
   → 카카오 사용자 정보 조회
   → 자동 회원가입 또는 기존 사용자 매칭
   → JWT 발급
   → 웹: Refresh Token 쿠키 + Access Token URL fragment로 프론트엔드 리다이렉트
   → 모바일: JSON 응답

3. POST /api/auth/kakao/exchange-token
   → Cross-Port 세션 문제 해결용 (개발 환경 5173 ↔ 9080)
   → 세션에 임시 저장된 토큰을 쿠키로 교환
```

### 4.8 로그아웃

```
POST /api/logout (Spring Security logout 핸들러)
  1. Bearer 토큰에서 userId 추출
  2. DB에서 해당 사용자의 모든 Refresh Token 폐기 (revoke)
  3. refreshToken 쿠키 제거 (MaxAge=0)
  4. 200 OK JSON 응답 반환
```

---

## 5. 데이터베이스 설계

### 5.1 ER 다이어그램 (전체)

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │◄────────────────────────────────────────────────┐
│ email (UQ)   │◄───────┐                                       │
│ password     │        │                                       │
│ name         │        │     ┌──────────────┐                  │
│ profile_image│        │     │ user_profile  │                  │
│ role         │        │     ├──────────────┤                  │
│ status       │        ├────►│ user_id (FK)  │                  │
│ provider     │        │     │ last_name     │                  │
│ provider_id  │        │     │ first_name    │                  │
│ is_active    │        │     │ phone_number  │                  │
│ created_at   │        │     │ birth         │                  │
│ updated_at   │        │     │ bg_image      │                  │
│ last_login_at│        │     └──────────────┘                  │
└──────────────┘        │                                       │
       │                │     ┌──────────────┐                  │
       │                │     │refresh_tokens │                  │
       │                │     ├──────────────┤                  │
       │                ├────►│ user_id (FK)  │                  │
       │                │     │ token (UQ)    │                  │
       │                │     │ is_revoked    │                  │
       │                │     │ expires_at    │                  │
       │                │     └──────────────┘                  │
       │                │                                       │
       │                │     ┌──────────────┐     ┌──────────────┐
       │                │     │    posts      │     │ post_images  │
       │                │     ├──────────────┤     ├──────────────┤
       │                ├────►│ user_id (FK)  │◄───│ post_id (FK) │
       │                │     │ content       │     │ image_url    │
       │                │     │ visibility    │     │ sort_order   │
       │                │     │ like_count    │     │ width/height │
       │                │     │ comment_count │     │ file_size    │
       │                │     │ view_count    │     │ media_type   │
       │                │     │ is_deleted    │     └──────────────┘
       │                │     └──────┬───────┘
       │                │            │
       │                │            │     ┌──────────────┐
       │                │            │     │   comments    │
       │                │            │     ├──────────────┤
       │                ├───────────►├────►│ post_id (FK) │
       │                │            │     │ user_id (FK) │
       │                │            │     │ parent_id(FK)│ ← 자기참조 (대댓글)
       │                │            │     │ content      │
       │                │            │     │ like_count   │
       │                │            │     │ is_deleted   │
       │                │            │     └──────────────┘
       │                │            │
       │                │            │     ┌──────────────┐
       │                │            │     │    likes      │
       │                │            │     ├──────────────┤
       │                ├───────────►├────►│ user_id (FK) │
       │                │                  │ target_type  │ ← POST / COMMENT
       │                │                  │ target_id    │
       │                │                  └──────────────┘
       │                │
       │                │     ┌──────────────┐
       │                │     │   follows     │
       │                │     ├──────────────┤
       │                ├────►│ follower_id   │
       │                ├────►│ following_id  │
       │                │     └──────────────┘
       │                │
       │                │     ┌──────────────┐
       │                │     │  bookmarks    │
       │                │     ├──────────────┤
       │                ├────►│ user_id (FK)  │
       │                │     │ post_id (FK)  │
       │                │     └──────────────┘
       │                │
       │                │     ┌──────────────┐     ┌──────────────┐
       │                │     │  hashtags     │     │ post_hashtags│
       │                │     ├──────────────┤     ├──────────────┤
       │                │     │ name (UQ)    │◄───│ hashtag_id   │
       │                │     │ post_count   │     │ post_id (FK) │
       │                │     └──────────────┘     └──────────────┘
       │                │
       │                │     ┌──────────────┐
       │                │     │  mentions     │
       │                │     ├──────────────┤
       │                ├────►│ user_id (FK) │ ← 멘션 받은 사용자
       │                ├────►│ mentioned_by │ ← 멘션한 사용자
       │                │     │ target_type  │ ← POST / COMMENT
       │                │     │ target_id    │
       │                │     └──────────────┘
       │                │
       │                │     ┌──────────────┐     ┌──────────────┐
       │                │     │  dm_rooms     │     │ dm_messages  │
       │                │     ├──────────────┤     ├──────────────┤
       │                ├────►│ user1_id(FK) │◄───│ room_id (FK) │
       │                └────►│ user2_id(FK) │     │ sender_id(FK)│
       │                      │ updated_at   │     │ content      │
       │                      └──────────────┘     │ is_read      │
       │                                           └──────────────┘
       │
```

### 5.2 테이블 목록 (14개)

| 테이블 | 엔티티 | 설명 | 주요 제약조건 |
|--------|--------|------|-------------|
| `users` | `User` | 사용자 | UNIQUE(email) |
| `user_profile` | `UserProfile` | 사용자 프로필 | FK(user_id) |
| `refresh_tokens` | `RefreshToken` | JWT Refresh Token | UNIQUE(token), FK(user_id) |
| `posts` | `Post` | 게시글 | FK(user_id), Soft Delete |
| `post_images` | `PostImage` | 게시글 이미지 | FK(post_id) |
| `comments` | `Comment` | 댓글/대댓글 | FK(post_id, user_id, parent_id), Soft Delete |
| `likes` | `Like` | 좋아요 (다형성) | UNIQUE(user_id, target_type, target_id) |
| `follows` | `Follow` | 팔로우 | UNIQUE(follower_id, following_id) |
| `bookmarks` | `Bookmark` | 북마크 | UNIQUE(user_id, post_id) |
| `hashtags` | `Hashtag` | 해시태그 | UNIQUE(name) |
| `post_hashtags` | `PostHashtag` | 게시글-해시태그 | 복합 PK(post_id, hashtag_id) |
| `mentions` | `Mention` | 멘션 (다형성) | FK(user_id, mentioned_by_id) |
| `dm_rooms` | `DmRoom` | DM 채팅방 | UNIQUE(user1_id, user2_id) |
| `dm_messages` | `DmMessage` | DM 메시지 | FK(room_id, sender_id) |

### 5.3 User 엔티티 상세

```java
@Entity
@Table(name = "users")
public class User implements UserDetails {
    Long id;
    String email;            // UNIQUE
    String password;         // BCrypt 암호화
    String name;
    String profileImage;     // 프로필 이미지 URL
    Role role;               // ADMIN, USER
    Status status;           // ACTIVE, INACTIVE, SUSPENDED, DELETED
    boolean isActive;        // 활성 상태
    String provider;         // OAuth 제공자 (KAKAO 등)
    String providerId;       // OAuth 제공자 사용자 ID
    LocalDateTime lastLoginAt;
    LocalDateTime createdAt; // @CreationTimestamp
    LocalDateTime updatedAt; // @UpdateTimestamp
}
```

**UserDetails 구현:** Spring Security 인증에 직접 사용 (`@AuthenticationPrincipal User user`)

### 5.4 Enum 타입

| Enum | 값 | 사용처 |
|------|----|--------|
| `Role` | `ADMIN`, `USER` | User.role |
| `Status` | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `DELETED` | User.status |
| `Visibility` | `PUBLIC`, `PRIVATE`, `FOLLOWERS` | Post.visibility |
| `MediaType` | `IMAGE`, `VIDEO` | PostImage.mediaType |
| `TargetType` | `POST`, `COMMENT` | Like.targetType, Mention.targetType |

---

## 6. API 엔드포인트 전체 목록

### 6.1 인증 (`AuthController`, `KakaoAuthController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| GET | `/api/health` | X | 서버 상태 확인 |
| POST | `/api/signup` | X | 회원가입 |
| POST | `/api/login` | X | 로그인 (웹/모바일 하이브리드) |
| POST | `/api/refresh` | X | Access Token 갱신 |
| POST | `/api/logout` | O | 로그아웃 (Security 핸들러) |
| GET | `/api/auth/kakao/login` | X | 카카오 로그인 시작 (리다이렉트) |
| GET | `/api/auth/kakao/callback` | X | 카카오 로그인 콜백 |
| POST | `/api/auth/kakao/exchange-token` | X | 토큰 교환 (Cross-Port 해결) |

### 6.2 사용자 (`UserController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| GET | `/api/user/me` | O | 내 정보 조회 |
| GET | `/api/user/profile` | O | 내 프로필 조회 |
| PUT | `/api/user/profile` | O | 프로필 수정 |

### 6.3 게시글 (`PostController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/posts` | O | 게시글 작성 |
| POST | `/api/posts/with-images` | O | 이미지 포함 게시글 작성 (multipart) |
| GET | `/api/posts/{id}` | O | 게시글 상세 조회 |
| GET | `/api/posts` | O | 게시글 목록 (공개) |
| GET | `/api/posts/me` | O | 내 게시글 목록 |
| GET | `/api/posts/user/{userId}` | O | 특정 사용자 게시글 |
| PUT | `/api/posts/{id}` | O | 게시글 수정 |
| DELETE | `/api/posts/{id}` | O | 게시글 삭제 (Soft Delete) |

### 6.4 댓글 (`CommentController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/posts/{postId}/comments` | O | 댓글 작성 |
| GET | `/api/posts/{postId}/comments` | O | 댓글 목록 (최상위) |
| GET | `/api/comments/{commentId}/replies` | O | 대댓글 목록 |
| PUT | `/api/comments/{commentId}` | O | 댓글 수정 |
| DELETE | `/api/comments/{commentId}` | O | 댓글 삭제 (Soft Delete) |

### 6.5 좋아요 (`LikeController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/posts/{postId}/like` | O | 게시글 좋아요 |
| DELETE | `/api/posts/{postId}/like` | O | 게시글 좋아요 취소 |
| GET | `/api/posts/{postId}/likes` | O | 좋아요한 사용자 목록 |
| POST | `/api/comments/{commentId}/like` | O | 댓글 좋아요 |
| DELETE | `/api/comments/{commentId}/like` | O | 댓글 좋아요 취소 |

### 6.6 팔로우 (`FollowController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/users/{userId}/follow` | O | 팔로우 |
| DELETE | `/api/users/{userId}/follow` | O | 언팔로우 |
| GET | `/api/users/{userId}/followers` | O | 팔로워 목록 |
| GET | `/api/users/{userId}/followings` | O | 팔로잉 목록 |
| GET | `/api/users/{userId}/follow/status` | O | 팔로우 상태 확인 |
| GET | `/api/users/{userId}/follow/counts` | O | 팔로워/팔로잉 수 |

### 6.7 북마크 (`BookmarkController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/posts/{postId}/bookmark` | O | 북마크 |
| DELETE | `/api/posts/{postId}/bookmark` | O | 북마크 해제 |
| GET | `/api/bookmarks` | O | 내 북마크 목록 |

### 6.8 해시태그 (`HashtagController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| GET | `/api/hashtags/trending` | O | 인기 해시태그 |
| GET | `/api/hashtags/search` | O | 해시태그 검색 |
| GET | `/api/hashtags/{hashtagId}` | O | 해시태그 상세 |
| GET | `/api/hashtags/{hashtagId}/posts` | O | 해시태그별 게시글 |
| GET | `/api/hashtags/name/{name}/posts` | O | 해시태그명으로 게시글 검색 |

### 6.9 피드 (`FeedController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| GET | `/api/feed/home` | O | 홈 피드 (팔로잉 사용자 게시글) |
| GET | `/api/feed/explore` | O | 탐색 피드 (최신 공개 게시글) |
| GET | `/api/feed/popular` | O | 인기 피드 (좋아요순) |
| GET | `/api/feed/most-viewed` | O | 조회수 피드 |
| GET | `/api/feed/recommended` | O | 추천 피드 |

### 6.10 이미지 업로드 (`ImageUploadController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/upload/image` | O | 이미지 업로드 (multipart) |
| DELETE | `/api/upload/image/{fileName}` | O | 이미지 삭제 |

### 6.11 DM (`DmController`)

| HTTP | URL | 인증 | 설명 |
|------|-----|------|------|
| POST | `/api/dm/rooms` | O | 채팅방 생성/조회 |
| GET | `/api/dm/rooms` | O | 내 채팅방 목록 |
| GET | `/api/dm/rooms/{roomId}/messages` | O | 메시지 목록 (페이징) |
| POST | `/api/dm/rooms/{roomId}/messages` | O | 메시지 전송 |
| PUT | `/api/dm/rooms/{roomId}/read` | O | 읽음 처리 |
| DELETE | `/api/dm/rooms/{roomId}` | O | 채팅방 나가기 |
| GET | `/api/dm/rooms/{roomId}/messages/new` | O | 새 메시지 폴링 |
| GET | `/api/dm/unread-count` | O | 전체 안 읽은 메시지 수 |

---

## 7. 레이어별 파일 구조

### 7.1 전체 패키지 구조

```
src/main/java/com/example/myauth/
│
├── config/                          ← 설정 클래스
│   ├── AppProperties.java           ← 커스텀 설정 (app.cookie, app.cors, app.oauth)
│   ├── SecurityConfig.java          ← Spring Security 필터 체인
│   ├── CorsConfig.java              ← CORS 매핑
│   ├── WebMvcConfig.java            ← 정적 리소스 (/uploads) 매핑
│   ├── JacksonConfig.java           ← Jackson 3 ObjectMapper Bean
│   └── KakaoOAuthProperties.java    ← 카카오 OAuth 설정 (oauth.kakao)
│
├── security/                        ← 보안 관련
│   ├── JwtTokenProvider.java        ← JWT 생성/검증
│   ├── JwtAuthenticationFilter.java ← JWT 인증 필터
│   ├── CustomUserDetailsService.java ← UserDetails 로딩
│   ├── CustomUserDetails.java       ← UserDetails 구현체
│   ├── CustomLogoutHandler.java     ← 로그아웃 처리
│   └── CustomLogoutSuccessHandler.java ← 로그아웃 성공 응답
│
├── entity/                          ← JPA 엔티티 (14개)
│   ├── User.java                    ← 사용자 (UserDetails 구현)
│   ├── UserProfile.java             ← 사용자 프로필
│   ├── RefreshToken.java            ← Refresh Token
│   ├── Post.java                    ← 게시글
│   ├── PostImage.java               ← 게시글 이미지
│   ├── Comment.java                 ← 댓글 (자기참조 대댓글)
│   ├── Like.java                    ← 좋아요 (다형성)
│   ├── Follow.java                  ← 팔로우
│   ├── Bookmark.java                ← 북마크
│   ├── Hashtag.java                 ← 해시태그
│   ├── PostHashtag.java             ← 게시글-해시태그 (N:M)
│   ├── Mention.java                 ← 멘션 (다형성)
│   ├── DmRoom.java                  ← DM 채팅방
│   └── DmMessage.java              ← DM 메시지
│
├── repository/                      ← JPA 리포지토리 (14개)
│   ├── UserRepository.java
│   ├── UserProfileRepository.java
│   ├── RefreshTokenRepository.java
│   ├── PostRepository.java
│   ├── PostImageRepository.java
│   ├── CommentRepository.java
│   ├── LikeRepository.java
│   ├── FollowRepository.java
│   ├── BookmarkRepository.java
│   ├── HashtagRepository.java
│   ├── PostHashtagRepository.java
│   ├── MentionRepository.java
│   ├── DmRoomRepository.java
│   └── DmMessageRepository.java
│
├── service/                         ← 비즈니스 로직 (14개)
│   ├── AuthService.java             ← 인증 (회원가입, 로그인, 토큰 갱신)
│   ├── KakaoOAuthService.java       ← 카카오 OAuth 2.0
│   ├── UserService.java             ← 사용자/프로필
│   ├── PostService.java             ← 게시글 CRUD
│   ├── CommentService.java          ← 댓글/대댓글
│   ├── LikeService.java             ← 좋아요
│   ├── FollowService.java           ← 팔로우
│   ├── BookmarkService.java         ← 북마크
│   ├── HashtagService.java          ← 해시태그
│   ├── MentionService.java          ← 멘션
│   ├── FeedService.java             ← 피드
│   ├── DmService.java               ← DM
│   ├── ImageStorageService.java     ← 이미지 저장 인터페이스
│   ├── LocalImageStorageService.java ← 로컬 파일 저장 (@Primary)
│   └── S3ImageStorageService.java   ← S3 저장 (미구현 스텁)
│
├── controller/                      ← REST 컨트롤러 (12개)
│   ├── AuthController.java          ← 인증 API
│   ├── KakaoAuthController.java     ← 카카오 OAuth API
│   ├── UserController.java          ← 사용자 API
│   ├── PostController.java          ← 게시글 API
│   ├── CommentController.java       ← 댓글 API
│   ├── LikeController.java          ← 좋아요 API
│   ├── FollowController.java        ← 팔로우 API
│   ├── BookmarkController.java      ← 북마크 API
│   ├── HashtagController.java       ← 해시태그 API
│   ├── FeedController.java          ← 피드 API
│   ├── ImageUploadController.java   ← 이미지 업로드 API
│   └── DmController.java           ← DM API
│
├── dto/                             ← 요청/응답 DTO
│   ├── ApiResponse.java             ← 공통 응답 래퍼 {success, message, data}
│   ├── LoginRequest.java
│   ├── LoginResponse.java           ← 내부 UserInfo 포함
│   ├── SignupRequest.java
│   ├── TokenRefreshRequest.java
│   ├── TokenRefreshResponse.java
│   ├── UserResponse.java
│   ├── UserProfileUpdateRequest.java
│   ├── UserProfileUpdateResponse.java
│   ├── ImageUploadResponse.java
│   ├── JwtErrorResponse.java        ← errorCode, action 필드
│   ├── kakao/KakaoOAuthDto.java     ← 카카오 API 응답 DTO
│   ├── post/                        ← 게시글 DTO (6개)
│   ├── comment/                     ← 댓글 DTO (4개)
│   ├── like/                        ← 좋아요 DTO (2개)
│   ├── follow/                      ← 팔로우 DTO (3개)
│   ├── bookmark/                    ← 북마크 DTO (2개)
│   ├── hashtag/                     ← 해시태그 DTO (2개)
│   ├── mention/                     ← 멘션 DTO (1개)
│   └── dm/                          ← DM DTO (8개)
│
├── exception/                       ← 예외 클래스 (20개 + 핸들러)
│   ├── GlobalExceptionHandler.java  ← @RestControllerAdvice
│   └── ...Exception.java           ← RuntimeException 상속
│
└── util/                            ← 유틸리티
    └── ClientTypeDetector.java      ← 웹/모바일 클라이언트 감지
```

### 7.2 리소스 파일

```
src/main/resources/
├── application.yaml          ← 공통 설정 (DB, JWT, OAuth, 파일 업로드)
├── application-dev.yaml      ← 개발 환경 (SQL 로그, DEBUG, localhost CORS)
└── application-prod.yaml     ← 프로덕션 (로그 파일, 배치 최적화, 환경변수 CORS)
```

---

## 8. 환경 설정

### 8.1 공통 설정 (application.yaml)

| 설정 | 값 | 설명 |
|------|-----|------|
| `server.port` | 9080 | 내장 Tomcat 포트 |
| `spring.datasource.url` | `${DB_URL:jdbc:mysql://localhost:3306/mannal}` | MySQL 연결 |
| `spring.jpa.hibernate.ddl-auto` | none | 기본값 (프로덕션: update) |
| `spring.servlet.multipart.max-file-size` | 10MB | 최대 업로드 파일 크기 |
| `jwt.secret` | `${JWT_SECRET:...}` | JWT 서명 키 (환경변수) |
| `jwt.access-token-expiration` | 3,600,000ms (1시간) | Access Token 유효기간 |
| `jwt.refresh-token-expiration` | 604,800,000ms (7일) | Refresh Token 유효기간 |
| `file.upload.dir` | `${FILE_UPLOAD_DIR:./uploads}` | 파일 저장 경로 |
| `file.upload.base-url` | `${FILE_UPLOAD_BASE_URL:http://localhost:9080/uploads}` | 파일 접근 URL |

### 8.2 개발 환경 (application-dev.yaml)

| 설정 | 값 |
|------|-----|
| JPA SQL 로그 | 활성화 (show-sql: true, format_sql: true) |
| Security 로그 | DEBUG 레벨 |
| 쿠키 Secure | false (HTTP) |
| 쿠키 Domain | `localhost` (포트 무관 공유) |
| CORS 허용 | `http://localhost:5173`, `http://localhost` |
| 카카오 리다이렉트 | `http://localhost:5173/oauth/callback` |

### 8.3 프로덕션 환경 (application-prod.yaml)

| 설정 | 값 |
|------|-----|
| 로깅 | WARN (root), INFO (com.example.myauth) |
| 로그 파일 | `/app/logs/myauth.log` (20MB, 30일, 1GB 상한) |
| JPA SQL 로그 | 비활성화 |
| Hibernate 배치 | batch_size: 20, order_inserts/updates: true |
| DDL Auto | update (테이블 자동 생성/수정) |
| 쿠키 Secure | false (HTTPS 도메인 없음) |
| 쿠키 Domain | `""` (IP 환경 — 생략하여 브라우저 자동 바인딩) |
| CORS 허용 | `${FRONTEND_URL}` (환경변수) |
| 카카오 리다이렉트 | `${FRONTEND_URL}/oauth/callback` |

### 8.4 환경변수 목록 (프로덕션 필수)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DB_URL` | MySQL JDBC URL | `jdbc:mysql://mysql:3306/mannal?...` |
| `DB_USERNAME` | DB 사용자명 | `root` |
| `DB_PASSWORD` | DB 비밀번호 | `***` |
| `JWT_SECRET` | JWT 서명 키 (Base64) | `***` |
| `KAKAO_CLIENT_ID` | 카카오 앱 REST API 키 | `f0bfa98d...` |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret | `U4JgTAZG...` |
| `KAKAO_REDIRECT_URI` | 카카오 콜백 URL (**`/api` 접두사 필수**) | `http://IP/api/auth/kakao/callback` |
| `FRONTEND_URL` | 프론트엔드 URL | `http://16.184.53.118` |
| `FILE_UPLOAD_BASE_URL` | 파일 접근 기본 URL | `http://16.184.53.118:8080/uploads` |
| `SPRING_PROFILES_ACTIVE` | 활성 프로필 | `prod` |

---

## 9. 인프라 및 배포

### 9.1 Docker 구성

**Dockerfile (멀티스테이지 빌드):**

```
Stage 1: amazoncorretto:17-alpine (빌드)
  → Gradle bootJar (테스트 제외)
  → app.jar 생성

Stage 2: amazoncorretto:17-alpine (실행)
  → TZ=Asia/Seoul
  → EXPOSE 9080
  → java -jar app.jar
```

**docker-compose.prod.yml:**

```
┌─────────────────────────────────────┐
│           prod-network              │
│                                     │
│  ┌──────────┐    ┌──────────────┐   │
│  │  mysql    │    │     app      │   │
│  │  :3306   │◄───│   :9080      │   │
│  │          │    │ (8080 외부)   │   │
│  └──────────┘    └──────────────┘   │
│                                     │
│  Volumes:                           │
│  - prod-mysql-data                  │
│  - prod-upload-data (/app/uploads)  │
└─────────────────────────────────────┘
```

### 9.2 CI/CD 파이프라인 (GitHub Actions)

```
push to main
    │
    ▼
┌─────────────────────────┐
│  1. Checkout            │
│  2. Java 17 Setup       │
│  3. Gradle Build        │
│  4. Docker Build & Push │  → GHCR (ghcr.io/icesnake72/myauth)
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│  5. SCP docker-compose  │  → AWS Lightsail
│  6. SSH Deploy          │
│     - .env 생성         │
│     - docker pull       │
│     - docker compose up │
│     - image prune       │
└─────────────────────────┘
```

### 9.3 프로덕션 네트워크 구성

```
인터넷
  │
  ▼ (80/443)
┌──────────┐
│  Nginx   │  ← Lightsail 서버에 직접 설치
│          │
│  / → 프론트엔드 (정적 파일 또는 별도 컨테이너)
│  /api → proxy_pass http://localhost:8080
│  /uploads → proxy_pass http://localhost:8080
└──────────┘
      │ (8080)
      ▼
┌──────────────┐
│ Docker: app  │  ← 8080:9080 포트 매핑
│ Spring Boot  │
└──────────────┘
      │ (3306)
      ▼
┌──────────────┐
│ Docker: mysql│
└──────────────┘
```

---

## 10. 주요 설계 패턴

### 10.1 공통 응답 DTO

```java
// 모든 API 응답을 통일된 형식으로 반환
ApiResponse<T> {
    boolean success;   // 성공 여부
    String message;    // 메시지
    T data;            // 응답 데이터 (없으면 null)
}

// 사용 예시
ApiResponse.success("로그인 성공", loginResponse);
ApiResponse.error("사용자를 찾을 수 없습니다.");
```

### 10.2 엔티티 패턴

```java
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @DynamicInsert
@Table(name = "...",
    uniqueConstraints = { @UniqueConstraint(...) },
    indexes = { @Index(...) }
)
public class Entity {
    // 팩토리 메서드
    public static Entity create(...) { return Entity.builder()...build(); }
}
```

### 10.3 DTO 변환 패턴

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Response {
    // 정적 팩토리 메서드로 Entity → DTO 변환
    public static Response from(Entity entity) {
        return Response.builder()
            .field(entity.getField())
            .build();
    }
}
```

### 10.4 예외 처리 패턴

```java
// 커스텀 예외 (RuntimeException 상속)
public class XxxException extends RuntimeException {
    public XxxException(String message) { super(message); }
    public XxxException() { super("기본 메시지"); }
}

// 전역 핸들러 (@RestControllerAdvice)
@ExceptionHandler(XxxException.class)
public ResponseEntity<ApiResponse<Void>> handleXxx(XxxException ex) {
    log.warn("로그: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.XXX).body(ApiResponse.error(ex.getMessage()));
}
```

### 10.5 서비스 트랜잭션 패턴

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)  // 클래스 레벨 기본값
public class Service {

    @Transactional                // 쓰기 작업은 명시적으로 오버라이드
    public Response create(...) { }

    public Response get(...) { }   // readOnly 상속
}
```

### 10.6 N+1 방지 전략

```java
// Repository에서 JOIN FETCH 사용
@Query("SELECT e FROM Entity e JOIN FETCH e.relation WHERE e.id = :id")
Optional<Entity> findByIdWithRelation(@Param("id") Long id);

// 배치 IN 쿼리로 다건 조회
@Query("SELECT e.id FROM Entity e WHERE e.field IN :values")
List<Long> findIdsByValues(@Param("values") List<Long> values);
```

### 10.7 다형성 설계 (좋아요/멘션)

```java
// 하나의 테이블로 여러 대상(게시글/댓글) 처리
@Enumerated(EnumType.STRING)
private TargetType targetType;  // POST or COMMENT

private Long targetId;          // 대상 ID

// UNIQUE(user_id, target_type, target_id)로 중복 방지
```

### 10.8 Soft Delete 패턴

```java
// 게시글/댓글에 적용
@Column(name = "is_deleted")
private boolean isDeleted = false;

// 삭제 시 실제 DELETE 대신 플래그 변경
public void softDelete() { this.isDeleted = true; }

// 댓글은 "삭제된 댓글입니다" 메시지 표시
public String getDisplayContent() {
    return isDeleted ? "삭제된 댓글입니다." : content;
}
```

### 10.9 이미지 저장 전략 패턴

```java
// 인터페이스로 추상화
public interface ImageStorageService {
    String store(MultipartFile file);
    void delete(String fileName);
}

// 로컬 저장 구현 (@Primary)
@Primary @Service
public class LocalImageStorageService implements ImageStorageService { }

// S3 구현 (미구현 스텁, 향후 확장)
@Service
public class S3ImageStorageService implements ImageStorageService { }
```

파일명: UUID + 원본 확장자 (예: `907698fa-xxxx.jpg`)
저장 URL: `{base-url}/{uuid-filename}`
