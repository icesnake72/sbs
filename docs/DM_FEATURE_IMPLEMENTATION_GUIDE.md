# DM(Direct Message) 기능 구현 가이드

> 사용자 간 1:1 다이렉트 메시지 기능 — REST API 기반, 텍스트 전용

## 📋 목차

1. [개요](#1-개요)
2. [데이터베이스 설계](#2-데이터베이스-설계)
3. [API 엔드포인트](#3-api-엔드포인트)
4. [파일 구조](#4-파일-구조)
5. [엔티티 상세](#5-엔티티-상세)
6. [리포지토리 상세](#6-리포지토리-상세)
7. [DTO 상세](#7-dto-상세)
8. [서비스 상세](#8-서비스-상세)
9. [컨트롤러 상세](#9-컨트롤러-상세)
10. [예외 처리](#10-예외-처리)
11. [구현 순서](#11-구현-순서)
12. [핵심 설계 포인트](#12-핵심-설계-포인트)
13. [API 사용 예시](#13-api-사용-예시)
14. [검증 방법](#14-검증-방법)

---

## 1. 개요

### 1.1 기능 범위

```
┌─────────────────────────────────────────────────────────┐
│                    DM (Direct Message)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💬 채팅방 (DM Room)                                     │
│     └── 1:1 채팅방 생성 (중복 방지)                       │
│     └── 내 채팅방 목록 조회 (최근 활동순)                  │
│     └── 채팅방 삭제 (나가기)                              │
│                                                         │
│  ✉️ 메시지 (DM Message)                                  │
│     └── 텍스트 메시지 전송                                │
│     └── 메시지 목록 조회 (페이징)                         │
│     └── 읽음 처리 (일괄)                                 │
│     └── 새 메시지 폴링                                   │
│                                                         │
│  🔢 안 읽은 메시지                                       │
│     └── 채팅방별 안 읽은 메시지 수                        │
│     └── 전체 안 읽은 메시지 수                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| 통신 방식 | REST API (HTTP 폴링 기반) |
| 메시지 유형 | 텍스트 전용 (최대 2,000자) |
| 채팅 형태 | 1:1 다이렉트 메시지 |
| 인증 | JWT (기존 인증 체계 사용) |
| 페이징 | Spring Data Pageable |

### 1.3 미포함 기능 (향후 확장 가능)

- WebSocket 실시간 통신
- 이미지/파일 전송
- 그룹 채팅
- 메시지 수정/삭제
- 타이핑 표시

---

## 2. 데이터베이스 설계

### 2.1 ER 다이어그램

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │   dm_rooms   │       │ dm_messages  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──┐   │ id (PK)      │◄──────│ id (PK)      │
│ email        │   ├───│ user1_id(FK) │       │ room_id (FK) │
│ name         │   └───│ user2_id(FK) │   ┌───│ sender_id(FK)│
│ profile_image│       │ created_at   │   │   │ content      │
│ ...          │◄──────│ updated_at   │   │   │ is_read      │
│              │       └──────────────┘   │   │ created_at   │
│              │◄─────────────────────────┘   └──────────────┘
└──────────────┘
```

### 2.2 dm_rooms 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 채팅방 고유 식별자 |
| `user1_id` | BIGINT | FK → users(id), NOT NULL | 참여자 1 (항상 **작은 ID**) |
| `user2_id` | BIGINT | FK → users(id), NOT NULL | 참여자 2 (항상 **큰 ID**) |
| `created_at` | TIMESTAMP | NOT NULL | 채팅방 생성 일시 |
| `updated_at` | TIMESTAMP | NOT NULL | 마지막 활동 일시 |

**인덱스:**

| 인덱스명 | 컬럼 | 용도 |
|---------|------|------|
| `uk_dm_room_users` | `(user1_id, user2_id)` UNIQUE | 같은 두 사용자 간 중복 채팅방 방지 |
| `idx_dm_user1_id` | `user1_id` | user1으로 참여한 채팅방 조회 |
| `idx_dm_user2_id` | `user2_id` | user2로 참여한 채팅방 조회 |
| `idx_dm_updated_at` | `updated_at` | 최근 활동순 정렬 |

**핵심 규칙:** `user1_id < user2_id`를 항상 보장

- 사용자 A(id=3)와 사용자 B(id=7)의 채팅방 → `user1_id=3`, `user2_id=7`
- 사용자 B(id=7)가 사용자 A(id=3)에게 채팅 시도 → 기존 채팅방(user1_id=3, user2_id=7) 재사용
- UNIQUE 제약조건과 ID 정규화로 **중복 채팅방 완벽 방지**

### 2.3 dm_messages 테이블

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 메시지 고유 식별자 |
| `room_id` | BIGINT | FK → dm_rooms(id), NOT NULL, CASCADE DELETE | 소속 채팅방 |
| `sender_id` | BIGINT | FK → users(id), NOT NULL | 발신자 |
| `content` | VARCHAR(2000) | NOT NULL | 메시지 내용 |
| `is_read` | BOOLEAN | DEFAULT false | 수신자 읽음 여부 |
| `created_at` | TIMESTAMP | NOT NULL | 전송 일시 |

**인덱스:**

| 인덱스명 | 컬럼 | 용도 |
|---------|------|------|
| `idx_dm_msg_room_created` | `(room_id, created_at DESC)` | 채팅방별 메시지 페이징 조회 |
| `idx_dm_msg_unread` | `(room_id, is_read, sender_id)` | 안 읽은 메시지 카운팅 |

### 2.4 SQL 스키마 (참고용)

```sql
-- 채팅방 테이블
CREATE TABLE dm_rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user1_id BIGINT NOT NULL,
    user2_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_dm_room_users UNIQUE (user1_id, user2_id),
    CONSTRAINT fk_dm_room_user1 FOREIGN KEY (user1_id) REFERENCES users(id),
    CONSTRAINT fk_dm_room_user2 FOREIGN KEY (user2_id) REFERENCES users(id),

    INDEX idx_dm_user1_id (user1_id),
    INDEX idx_dm_user2_id (user2_id),
    INDEX idx_dm_updated_at (updated_at)
);

-- 메시지 테이블
CREATE TABLE dm_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content VARCHAR(2000) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dm_msg_room FOREIGN KEY (room_id) REFERENCES dm_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_dm_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id),

    INDEX idx_dm_msg_room_created (room_id, created_at DESC),
    INDEX idx_dm_msg_unread (room_id, is_read, sender_id)
);
```

> **참고:** JPA `ddl-auto=update` 설정으로 테이블이 자동 생성되므로 SQL을 직접 실행할 필요 없음

---

## 3. API 엔드포인트

모든 API는 **인증 필요** (JWT Access Token). 기존 SecurityConfig의 `.anyRequest().authenticated()`에 자동 포함됨.

### 3.1 API 목록

| HTTP | URL | 기능 | 요청 바디 | 응답 |
|------|-----|------|----------|------|
| POST | `/api/dm/rooms` | 채팅방 생성 또는 기존 채팅방 조회 | `{ targetUserId }` | `DmRoomResponse` |
| GET | `/api/dm/rooms` | 내 채팅방 목록 | - | `List<DmRoomListResponse>` |
| GET | `/api/dm/rooms/{roomId}/messages` | 메시지 목록 (페이징) | `?page=0&size=50` | `Page<DmMessageResponse>` |
| POST | `/api/dm/rooms/{roomId}/messages` | 메시지 전송 | `{ content }` | `DmMessageResponse` |
| PUT | `/api/dm/rooms/{roomId}/read` | 읽음 처리 (일괄) | - | `Void` |
| DELETE | `/api/dm/rooms/{roomId}` | 채팅방 나가기 (삭제) | - | `Void` |
| GET | `/api/dm/rooms/{roomId}/messages/new` | 새 메시지 폴링 | `?lastMessageId=123` | `List<DmMessageResponse>` |
| GET | `/api/dm/unread-count` | 전체 안 읽은 메시지 수 | - | `DmUnreadCountResponse` |

### 3.2 API 상세

#### 3.2.1 채팅방 생성/조회

```
POST /api/dm/rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "targetUserId": 5
}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "채팅방 조회 성공",
  "data": {
    "roomId": 1,
    "otherUser": {
      "id": 5,
      "name": "홍길동",
      "profileImage": "http://example.com/uploads/profile.jpg"
    },
    "createdAt": "2026-03-07T10:00:00"
  }
}
```

**동작 방식:**
1. `targetUserId`가 자신인지 확인 → 자신이면 `SelfDmException` (400)
2. 두 사용자 ID를 정규화 (작은 ID = user1, 큰 ID = user2)
3. 기존 채팅방 존재 여부 확인 → 있으면 반환, 없으면 새로 생성

---

#### 3.2.2 내 채팅방 목록

```
GET /api/dm/rooms
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "채팅방 목록 조회 성공",
  "data": [
    {
      "roomId": 1,
      "otherUser": {
        "id": 5,
        "name": "홍길동",
        "profileImage": "http://example.com/uploads/profile.jpg"
      },
      "lastMessage": {
        "content": "안녕하세요!",
        "senderId": 5,
        "createdAt": "2026-03-07T11:30:00"
      },
      "unreadCount": 3,
      "updatedAt": "2026-03-07T11:30:00"
    },
    {
      "roomId": 2,
      "otherUser": {
        "id": 8,
        "name": "김철수",
        "profileImage": null
      },
      "lastMessage": null,
      "unreadCount": 0,
      "updatedAt": "2026-03-07T09:00:00"
    }
  ]
}
```

**정렬:** `updatedAt DESC` (최근 활동 채팅방이 위로)

---

#### 3.2.3 메시지 목록 (페이징)

```
GET /api/dm/rooms/{roomId}/messages?page=0&size=50
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "메시지 목록 조회 성공",
  "data": {
    "content": [
      {
        "id": 100,
        "senderId": 3,
        "senderName": "나",
        "content": "안녕하세요!",
        "isRead": true,
        "isMine": true,
        "createdAt": "2026-03-07T11:30:00"
      },
      {
        "id": 99,
        "senderId": 5,
        "senderName": "홍길동",
        "content": "네, 반갑습니다!",
        "isRead": true,
        "isMine": false,
        "createdAt": "2026-03-07T11:29:00"
      }
    ],
    "totalElements": 50,
    "totalPages": 1,
    "number": 0,
    "size": 50
  }
}
```

**정렬:** `createdAt DESC` (최신 메시지가 먼저)
**기본 페이지 크기:** 50

---

#### 3.2.4 메시지 전송

```
POST /api/dm/rooms/{roomId}/messages
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "안녕하세요! 처음 인사드립니다."
}
```

**응답 (201 Created):**
```json
{
  "success": true,
  "message": "메시지 전송 성공",
  "data": {
    "id": 101,
    "senderId": 3,
    "senderName": "나",
    "content": "안녕하세요! 처음 인사드립니다.",
    "isRead": false,
    "isMine": true,
    "createdAt": "2026-03-07T11:35:00"
  }
}
```

**동작 방식:**
1. 현재 사용자가 해당 채팅방의 참여자인지 확인
2. 메시지 저장
3. 채팅방의 `updatedAt` 갱신 (목록 정렬에 반영)

---

#### 3.2.5 읽음 처리

```
PUT /api/dm/rooms/{roomId}/read
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "읽음 처리 완료"
}
```

**동작 방식:**
- 해당 채팅방에서 **상대방이 보낸 안 읽은 메시지**를 일괄 읽음 처리
- 쿼리 조건: `room_id = ? AND sender_id != currentUserId AND is_read = false`

---

#### 3.2.6 채팅방 나가기

```
DELETE /api/dm/rooms/{roomId}
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "채팅방을 나갔습니다."
}
```

**동작 방식:**
- 채팅방과 관련 메시지 모두 삭제 (CASCADE DELETE)
- 현재 사용자가 참여자인지 확인 후 삭제

---

#### 3.2.7 새 메시지 폴링

```
GET /api/dm/rooms/{roomId}/messages/new?lastMessageId=100
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "새 메시지 조회 성공",
  "data": [
    {
      "id": 101,
      "senderId": 5,
      "senderName": "홍길동",
      "content": "방금 보낸 메시지입니다.",
      "isRead": false,
      "isMine": false,
      "createdAt": "2026-03-07T11:36:00"
    }
  ]
}
```

**동작 방식:**
- `lastMessageId` 이후에 생성된 메시지만 반환 (`id > lastMessageId`)
- 프론트엔드에서 주기적으로 호출하여 실시간성 구현 (예: 3초 간격)

---

#### 3.2.8 전체 안 읽은 메시지 수

```
GET /api/dm/unread-count
Authorization: Bearer {accessToken}
```

**응답 (200 OK):**
```json
{
  "success": true,
  "message": "안 읽은 메시지 수 조회 성공",
  "data": {
    "totalUnreadCount": 7
  }
}
```

**용도:** 네비게이션 바의 DM 아이콘에 뱃지로 표시

---

## 4. 파일 구조

### 4.1 신규 생성 파일 (16개)

```
src/main/java/com/example/myauth/
├── entity/
│   ├── DmRoom.java              ← 채팅방 엔티티
│   └── DmMessage.java           ← 메시지 엔티티
│
├── repository/
│   ├── DmRoomRepository.java    ← 채팅방 리포지토리
│   └── DmMessageRepository.java ← 메시지 리포지토리
│
├── exception/
│   ├── DmRoomNotFoundException.java  ← 채팅방 없음 예외
│   └── SelfDmException.java          ← 자기 자신에게 DM 예외
│
├── dto/dm/
│   ├── DmRoomCreateRequest.java      ← 채팅방 생성 요청
│   ├── DmMessageCreateRequest.java   ← 메시지 전송 요청
│   ├── DmRoomResponse.java           ← 채팅방 응답
│   ├── DmRoomListResponse.java       ← 채팅방 목록 응답
│   ├── DmMessageResponse.java        ← 메시지 응답
│   ├── DmLastMessageResponse.java    ← 마지막 메시지 응답
│   ├── DmUserResponse.java           ← DM 사용자 정보 응답
│   └── DmUnreadCountResponse.java    ← 안 읽은 메시지 수 응답
│
├── service/
│   └── DmService.java           ← DM 비즈니스 로직
│
└── controller/
    └── DmController.java        ← DM API 컨트롤러
```

### 4.2 수정 파일 (1개)

```
src/main/java/com/example/myauth/
└── exception/
    └── GlobalExceptionHandler.java  ← DM 관련 예외 핸들러 추가
```

---

## 5. 엔티티 상세

### 5.1 DmRoom (채팅방)

```java
@Entity
@Table(name = "dm_rooms",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_dm_room_users",
                          columnNames = {"user1_id", "user2_id"})
    },
    indexes = {
        @Index(name = "idx_dm_user1_id", columnList = "user1_id"),
        @Index(name = "idx_dm_user2_id", columnList = "user2_id"),
        @Index(name = "idx_dm_updated_at", columnList = "updated_at")
    }
)
public class DmRoom {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;  // 항상 더 작은 userId

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;  // 항상 더 큰 userId

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

**유틸리티 메서드:**

| 메서드 | 설명 |
|--------|------|
| `static create(User a, User b)` | ID 정규화 후 채팅방 생성 (작은 ID → user1) |
| `isParticipant(Long userId)` | 해당 사용자가 참여자인지 확인 |
| `getOtherUser(Long userId)` | 상대방 User 반환 |

### 5.2 DmMessage (메시지)

```java
@Entity
@Table(name = "dm_messages",
    indexes = {
        @Index(name = "idx_dm_msg_room_created",
               columnList = "room_id, created_at DESC"),
        @Index(name = "idx_dm_msg_unread",
               columnList = "room_id, is_read, sender_id")
    }
)
public class DmMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private DmRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = 2000)
    private String content;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

**유틸리티 메서드:**

| 메서드 | 설명 |
|--------|------|
| `static create(DmRoom room, User sender, String content)` | 메시지 생성 팩토리 |
| `isMine(Long userId)` | 내가 보낸 메시지인지 확인 |
| `markAsRead()` | 읽음 처리 |

---

## 6. 리포지토리 상세

### 6.1 DmRoomRepository

```java
public interface DmRoomRepository extends JpaRepository<DmRoom, Long> {

    // 두 사용자의 기존 채팅방 조회 (user1_id < user2_id 보장 필요)
    Optional<DmRoom> findByUser1IdAndUser2Id(Long user1Id, Long user2Id);

    // 채팅방 상세 조회 (N+1 방지 — user1, user2 JOIN FETCH)
    @Query("SELECT r FROM DmRoom r JOIN FETCH r.user1 JOIN FETCH r.user2 WHERE r.id = :roomId")
    Optional<DmRoom> findByIdWithUsers(@Param("roomId") Long roomId);

    // 특정 사용자의 모든 채팅방 조회 (최근 활동순)
    @Query("SELECT r FROM DmRoom r JOIN FETCH r.user1 JOIN FETCH r.user2 " +
           "WHERE r.user1.id = :userId OR r.user2.id = :userId " +
           "ORDER BY r.updatedAt DESC")
    List<DmRoom> findRoomsByUserId(@Param("userId") Long userId);
}
```

### 6.2 DmMessageRepository

```java
public interface DmMessageRepository extends JpaRepository<DmMessage, Long> {

    // 채팅방별 메시지 페이징 조회 (최신 순, sender JOIN FETCH)
    @Query("SELECT m FROM DmMessage m JOIN FETCH m.sender " +
           "WHERE m.room.id = :roomId ORDER BY m.createdAt DESC")
    Page<DmMessage> findByRoomIdOrderByCreatedAtDesc(
        @Param("roomId") Long roomId, Pageable pageable);

    // 채팅방의 마지막 메시지 조회
    Optional<DmMessage> findTopByRoomIdOrderByCreatedAtDesc(Long roomId);

    // 채팅방별 안 읽은 메시지 수 카운트
    // (sender가 나가 아닌 + 읽지 않은 메시지 = 상대방이 보낸 안 읽은 메시지)
    @Query("SELECT COUNT(m) FROM DmMessage m " +
           "WHERE m.room.id = :roomId AND m.sender.id != :userId AND m.isRead = false")
    long countUnreadMessages(@Param("roomId") Long roomId, @Param("userId") Long userId);

    // 일괄 읽음 처리 (상대방이 보낸 안 읽은 메시지 전부)
    @Modifying
    @Query("UPDATE DmMessage m SET m.isRead = true " +
           "WHERE m.room.id = :roomId AND m.sender.id != :userId AND m.isRead = false")
    int markAllAsRead(@Param("roomId") Long roomId, @Param("userId") Long userId);

    // 새 메시지 폴링 (lastMessageId 이후)
    @Query("SELECT m FROM DmMessage m JOIN FETCH m.sender " +
           "WHERE m.room.id = :roomId AND m.id > :lastMessageId ORDER BY m.createdAt ASC")
    List<DmMessage> findNewMessages(
        @Param("roomId") Long roomId, @Param("lastMessageId") Long lastMessageId);

    // 전체 안 읽은 메시지 수 (모든 채팅방 합산)
    @Query("SELECT COUNT(m) FROM DmMessage m " +
           "WHERE m.room.id IN :roomIds AND m.sender.id != :userId AND m.isRead = false")
    long countTotalUnreadMessages(
        @Param("roomIds") List<Long> roomIds, @Param("userId") Long userId);

    // 채팅방의 모든 메시지 삭제 (채팅방 삭제 시)
    void deleteAllByRoomId(Long roomId);
}
```

---

## 7. DTO 상세

### 7.1 요청 DTO

#### DmRoomCreateRequest
```java
public class DmRoomCreateRequest {
    @NotNull(message = "대상 사용자 ID는 필수입니다")
    private Long targetUserId;  // DM을 보낼 상대방 ID
}
```

#### DmMessageCreateRequest
```java
public class DmMessageCreateRequest {
    @NotBlank(message = "메시지 내용은 필수입니다")
    @Size(min = 1, max = 2000, message = "메시지는 1~2000자까지 입력 가능합니다")
    private String content;  // 메시지 내용
}
```

### 7.2 응답 DTO

#### DmRoomResponse (채팅방 생성/조회 응답)
```java
public class DmRoomResponse {
    private Long roomId;
    private DmUserResponse otherUser;   // 상대방 정보
    private LocalDateTime createdAt;

    // from() 팩토리 메서드
    public static DmRoomResponse from(DmRoom room, Long currentUserId) { ... }
}
```

#### DmRoomListResponse (채팅방 목록 응답)
```java
public class DmRoomListResponse {
    private Long roomId;
    private DmUserResponse otherUser;          // 상대방 정보
    private DmLastMessageResponse lastMessage;  // 마지막 메시지 (null 가능)
    private long unreadCount;                   // 안 읽은 메시지 수
    private LocalDateTime updatedAt;            // 마지막 활동 일시
}
```

#### DmMessageResponse (메시지 응답)
```java
public class DmMessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String content;
    private boolean isRead;
    private boolean isMine;         // 내가 보낸 메시지인지
    private LocalDateTime createdAt;

    // from() 팩토리 메서드
    public static DmMessageResponse from(DmMessage message, Long currentUserId) { ... }
}
```

#### DmLastMessageResponse (마지막 메시지)
```java
public class DmLastMessageResponse {
    private String content;
    private Long senderId;
    private LocalDateTime createdAt;
}
```

#### DmUserResponse (사용자 정보)
```java
public class DmUserResponse {
    private Long id;
    private String name;
    private String profileImage;

    // from() 팩토리 메서드
    public static DmUserResponse from(User user) { ... }
}
```

#### DmUnreadCountResponse (안 읽은 메시지 수)
```java
public class DmUnreadCountResponse {
    private long totalUnreadCount;
}
```

---

## 8. 서비스 상세

### 8.1 DmService

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DmService {

    private final DmRoomRepository dmRoomRepository;
    private final DmMessageRepository dmMessageRepository;
    private final UserRepository userRepository;
```

**메서드 목록:**

| 메서드 | 설명 | 트랜잭션 |
|--------|------|---------|
| `createOrGetRoom(User user, Long targetUserId)` | 채팅방 생성 또는 기존 반환 | `@Transactional` |
| `getMyRooms(User user)` | 내 채팅방 목록 (마지막 메시지, 안 읽은 수 포함) | readOnly |
| `getMessages(User user, Long roomId, Pageable pageable)` | 메시지 목록 (페이징) | readOnly |
| `sendMessage(User user, Long roomId, String content)` | 메시지 전송 | `@Transactional` |
| `markAsRead(User user, Long roomId)` | 읽음 처리 (일괄) | `@Transactional` |
| `leaveRoom(User user, Long roomId)` | 채팅방 나가기 (삭제) | `@Transactional` |
| `getNewMessages(User user, Long roomId, Long lastMessageId)` | 새 메시지 폴링 | readOnly |
| `getTotalUnreadCount(User user)` | 전체 안 읽은 메시지 수 | readOnly |

### 8.2 주요 비즈니스 로직

#### createOrGetRoom (채팅방 생성)
```
1. targetUserId == currentUserId → SelfDmException
2. targetUserId로 User 조회 → 없으면 예외
3. 두 ID를 정규화 (작은 ID = user1, 큰 ID = user2)
4. findByUser1IdAndUser2Id로 기존 채팅방 확인
5. 있으면 기존 반환, 없으면 DmRoom.create()로 생성 후 저장
```

#### sendMessage (메시지 전송)
```
1. roomId로 채팅방 조회 (JOIN FETCH) → 없으면 DmRoomNotFoundException
2. 현재 사용자가 참여자인지 확인 → 아니면 예외
3. DmMessage.create()로 메시지 생성
4. 메시지 저장
5. 채팅방 updatedAt 갱신
6. DmMessageResponse 반환
```

#### getMyRooms (채팅방 목록)
```
1. findRoomsByUserId로 내가 참여한 모든 채팅방 조회
2. 각 채팅방마다:
   a. 마지막 메시지 조회 (findTopByRoomIdOrderByCreatedAtDesc)
   b. 안 읽은 메시지 수 카운트 (countUnreadMessages)
   c. DmRoomListResponse 생성
3. updatedAt DESC 정렬된 리스트 반환
```

---

## 9. 컨트롤러 상세

### 9.1 DmController

```java
@Slf4j
@RestController
@RequestMapping("/api/dm")
@RequiredArgsConstructor
public class DmController {
    private final DmService dmService;
```

**엔드포인트 매핑:**

| 메서드 | HTTP | URL | 서비스 메서드 |
|--------|------|-----|-------------|
| `createRoom()` | POST | `/rooms` | `createOrGetRoom()` |
| `getMyRooms()` | GET | `/rooms` | `getMyRooms()` |
| `getMessages()` | GET | `/rooms/{roomId}/messages` | `getMessages()` |
| `sendMessage()` | POST | `/rooms/{roomId}/messages` | `sendMessage()` |
| `markAsRead()` | PUT | `/rooms/{roomId}/read` | `markAsRead()` |
| `leaveRoom()` | DELETE | `/rooms/{roomId}` | `leaveRoom()` |
| `getNewMessages()` | GET | `/rooms/{roomId}/messages/new` | `getNewMessages()` |
| `getUnreadCount()` | GET | `/unread-count` | `getTotalUnreadCount()` |

**인증:** 모든 엔드포인트에서 `@AuthenticationPrincipal User user` 사용

---

## 10. 예외 처리

### 10.1 커스텀 예외

| 예외 클래스 | HTTP 상태 | 발생 조건 |
|------------|----------|----------|
| `DmRoomNotFoundException` | 404 Not Found | 존재하지 않는 채팅방 접근 |
| `SelfDmException` | 400 Bad Request | 자기 자신에게 DM 시도 |

### 10.2 GlobalExceptionHandler 추가

```java
// DM 채팅방 없음 예외
@ExceptionHandler(DmRoomNotFoundException.class)
public ResponseEntity<ApiResponse<Void>> handleDmRoomNotFound(DmRoomNotFoundException e) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(e.getMessage()));
}

// 자기 자신에게 DM 예외
@ExceptionHandler(SelfDmException.class)
public ResponseEntity<ApiResponse<Void>> handleSelfDm(SelfDmException e) {
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.error(e.getMessage()));
}
```

---

## 11. 구현 순서

```
Step 1: 엔티티
  └── DmRoom.java ✅ (생성 완료)
  └── DmMessage.java

Step 2: 리포지토리
  └── DmRoomRepository.java
  └── DmMessageRepository.java

Step 3: 예외
  └── DmRoomNotFoundException.java
  └── SelfDmException.java

Step 4: 예외 핸들러 수정
  └── GlobalExceptionHandler.java (핸들러 2개 추가)

Step 5: DTO (8개)
  └── DmRoomCreateRequest.java
  └── DmMessageCreateRequest.java
  └── DmRoomResponse.java
  └── DmRoomListResponse.java
  └── DmMessageResponse.java
  └── DmLastMessageResponse.java
  └── DmUserResponse.java
  └── DmUnreadCountResponse.java

Step 6: 서비스
  └── DmService.java

Step 7: 컨트롤러
  └── DmController.java
```

---

## 12. 핵심 설계 포인트

### 12.1 채팅방 중복 방지

```
사용자 A(id=3) → B(id=7) 채팅 시작:
  → user1_id=3, user2_id=7 저장

사용자 B(id=7) → A(id=3) 채팅 시작:
  → user1_id=3, user2_id=7로 정규화
  → 기존 채팅방 발견 → 재사용

항상 user1_id < user2_id를 보장하므로
UNIQUE(user1_id, user2_id)로 중복 완벽 방지
```

### 12.2 N+1 문제 방지

| 쿼리 | JOIN FETCH 대상 |
|------|----------------|
| `findByIdWithUsers` | `user1`, `user2` |
| `findRoomsByUserId` | `user1`, `user2` |
| `findByRoomIdOrderByCreatedAtDesc` | `sender` |
| `findNewMessages` | `sender` |

### 12.3 읽음 처리 전략

```sql
-- 일괄 UPDATE로 성능 최적화 (메시지 하나씩 X, 한번에 처리 O)
UPDATE dm_messages
SET is_read = true
WHERE room_id = ?
  AND sender_id != ?    -- 상대방이 보낸 메시지만
  AND is_read = false    -- 아직 안 읽은 것만
```

### 12.4 폴링 방식 새 메시지 조회

```
프론트엔드에서 3초마다 호출:
GET /api/dm/rooms/{roomId}/messages/new?lastMessageId=100

→ id > 100인 메시지만 반환
→ 결과가 있으면 lastMessageId를 업데이트
→ WebSocket 없이도 준실시간 채팅 가능
```

### 12.5 기존 코드 패턴 준수

| 패턴 | 적용 |
|------|------|
| `@DynamicInsert` | 엔티티에 적용 (DEFAULT 값 활용) |
| `ApiResponse<T>` | 모든 API 응답에 사용 |
| `from()` 팩토리 | DTO 변환에 사용 |
| `@Transactional(readOnly=true)` | 서비스 클래스 레벨에 기본 적용 |
| Lombok | `@Getter`, `@Builder`, `@RequiredArgsConstructor` 등 |

---

## 13. API 사용 예시

### 13.1 DM 채팅 전체 플로우

```
1️⃣ 채팅방 생성
POST /api/dm/rooms
Body: { "targetUserId": 5 }
→ roomId: 1 반환

2️⃣ 메시지 전송
POST /api/dm/rooms/1/messages
Body: { "content": "안녕하세요!" }
→ 메시지 저장, 채팅방 updatedAt 갱신

3️⃣ 상대방이 채팅방 열기
GET /api/dm/rooms/1/messages?page=0&size=50
→ 메시지 목록 반환

4️⃣ 읽음 처리
PUT /api/dm/rooms/1/read
→ 상대방이 보낸 안 읽은 메시지 일괄 읽음 처리

5️⃣ 새 메시지 폴링 (3초 간격)
GET /api/dm/rooms/1/messages/new?lastMessageId=101
→ 새 메시지가 있으면 반환, 없으면 빈 배열

6️⃣ 채팅방 목록 확인
GET /api/dm/rooms
→ 최근 활동순으로 채팅방 목록 + 마지막 메시지 + 안 읽은 수

7️⃣ 전체 안 읽은 메시지 수 (네비게이션 뱃지)
GET /api/dm/unread-count
→ { "totalUnreadCount": 7 }
```

### 13.2 프론트엔드 폴링 구현 예시

```javascript
// 채팅방 진입 시 폴링 시작
let lastMessageId = 0;

const pollInterval = setInterval(async () => {
  const response = await fetch(
    `/api/dm/rooms/${roomId}/messages/new?lastMessageId=${lastMessageId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  const { data: newMessages } = await response.json();

  if (newMessages.length > 0) {
    // 새 메시지를 화면에 추가
    appendMessages(newMessages);
    // lastMessageId 업데이트
    lastMessageId = newMessages[newMessages.length - 1].id;
    // 읽음 처리
    await fetch(`/api/dm/rooms/${roomId}/read`, { method: 'PUT', ... });
  }
}, 3000); // 3초 간격

// 채팅방 이탈 시 폴링 중지
clearInterval(pollInterval);
```

---

## 14. 검증 방법

### 14.1 빌드 검증

```bash
# 컴파일 확인
./gradlew compileJava

# 서버 기동 확인 (테이블 자동 생성)
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### 14.2 API 테스트 (curl)

```bash
# 0. 로그인 (Access Token 획득)
TOKEN=$(curl -s -X POST http://localhost:9080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"1234"}' | jq -r '.data.accessToken')

# 1. 채팅방 생성
curl -X POST http://localhost:9080/api/dm/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": 2}'

# 2. 메시지 전송
curl -X POST http://localhost:9080/api/dm/rooms/1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "안녕하세요!"}'

# 3. 메시지 목록 조회
curl http://localhost:9080/api/dm/rooms/1/messages?page=0&size=50 \
  -H "Authorization: Bearer $TOKEN"

# 4. 읽음 처리
curl -X PUT http://localhost:9080/api/dm/rooms/1/read \
  -H "Authorization: Bearer $TOKEN"

# 5. 채팅방 목록
curl http://localhost:9080/api/dm/rooms \
  -H "Authorization: Bearer $TOKEN"

# 6. 안 읽은 메시지 수
curl http://localhost:9080/api/dm/unread-count \
  -H "Authorization: Bearer $TOKEN"

# 7. 새 메시지 폴링
curl "http://localhost:9080/api/dm/rooms/1/messages/new?lastMessageId=0" \
  -H "Authorization: Bearer $TOKEN"

# 8. 채팅방 나가기
curl -X DELETE http://localhost:9080/api/dm/rooms/1 \
  -H "Authorization: Bearer $TOKEN"
```