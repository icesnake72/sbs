/**
 * imageUrl.js - 이미지 URL 정규화 유틸리티
 *
 * 백엔드가 반환하는 이미지 URL에는 포트 번호가 포함될 수 있습니다.
 * 예: http://16.184.53.118:8080/uploads/파일.jpg
 *
 * nginx는 포트 80에서 /uploads/ 경로를 백엔드로 프록시하므로,
 * 포트 번호를 제거하여 nginx를 통해 이미지를 로드해야 합니다.
 * 예: http://16.184.53.118/uploads/파일.jpg  또는  /uploads/파일.jpg
 */

/**
 * 백엔드 이미지 URL에서 포트 번호를 제거하여 정규화합니다.
 *
 * @param {string} url - 백엔드에서 받은 이미지 URL
 * @returns {string} - 포트가 제거된 상대 경로 URL
 *
 * 변환 예시:
 *   http://16.184.53.118:8080/uploads/abc.jpg → /uploads/abc.jpg
 *   http://16.184.53.118/uploads/abc.jpg      → /uploads/abc.jpg
 *   /uploads/abc.jpg                          → /uploads/abc.jpg (그대로)
 *   http://k.kakaocdn.net/dn/...              → 그대로 (외부 URL)
 */
export function normalizeImageUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // /uploads/ 경로인 경우 상대 경로로 변환 (nginx 프록시 사용)
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }

    // 그 외 외부 URL(카카오 CDN 등)은 그대로 사용
    return url;
  } catch {
    // URL 파싱 실패 = 이미 상대 경로 (/uploads/... 형태)
    return url;
  }
}
