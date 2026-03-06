/**
 * imageUrl.js - 이미지 URL 정규화 유틸리티
 *
 * 백엔드가 반환하는 이미지 URL 패턴:
 *   1. http://IP:8080/uploads/UUID.jpg  → /uploads/UUID.jpg  (정상 경로)
 *   2. http://IP:8080/UUID.jpg          → /uploads/UUID.jpg  (uploads 누락된 경우)
 *   3. http://kakao.cdn/image.jpg       → 그대로 유지 (외부 CDN)
 *
 * 이미지 파일은 백엔드 컨테이너의 ~/app/uploads 디렉토리에 저장되며,
 * 백엔드가 /uploads/UUID.jpg 경로로 서비스합니다.
 * nginx는 /uploads/ 경로를 백엔드로 프록시합니다.
 */

/**
 * UUID 파일명 패턴 (8-4-4-4-12 형식)
 * 예: e53b18eb-7ea9-42f7-8886-ab7399405043.png
 */
const UUID_FILE_PATTERN = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp))$/i;

/**
 * 백엔드 이미지 URL을 nginx가 처리할 수 있는 상대 경로로 정규화합니다.
 *
 * @param {string} url - 백엔드에서 받은 이미지 URL
 * @returns {string|null} - 정규화된 상대 경로 URL
 *
 * 변환 예시:
 *   http://IP:8080/uploads/UUID.jpg → /uploads/UUID.jpg  (포트 제거)
 *   http://IP:8080/UUID.jpg         → /uploads/UUID.jpg  (uploads 접두사 추가)
 *   /uploads/UUID.jpg               → /uploads/UUID.jpg  (그대로)
 *   http://k.kakaocdn.net/dn/...    → 그대로 (외부 URL)
 */
export function normalizeImageUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // 케이스 1: /uploads/ 경로가 포함된 경우 → 상대 경로로 변환
    // 예: http://IP:8080/uploads/UUID.jpg → /uploads/UUID.jpg
    if (pathname.startsWith('/uploads/')) {
      return pathname;
    }

    // 케이스 2: UUID 파일명이 루트에 있는 경우 → /uploads/ 접두사 추가
    // 백엔드 API가 간혹 /uploads/ 없이 UUID 파일명만 반환하는 경우
    // 예: http://IP:8080/UUID.jpg → /uploads/UUID.jpg
    if (UUID_FILE_PATTERN.test(pathname)) {
      return '/uploads' + pathname;
    }

    // 케이스 3: 외부 URL (카카오 CDN, 구글 등) → 그대로 사용
    return url;
  } catch {
    // URL 파싱 실패 = 이미 상대 경로인 경우
    // 예: /uploads/UUID.jpg → 그대로
    if (url.startsWith('/uploads/')) {
      return url;
    }

    // UUID 파일명만 있는 경우 → /uploads/ 접두사 추가
    // 예: UUID.jpg → /uploads/UUID.jpg
    const filenamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    if (filenamePattern.test(url.replace(/^\//, ''))) {
      return '/uploads/' + url.replace(/^\//, '');
    }

    return url;
  }
}
