export const USER_STATUS = ['ACTIVE', 'DELETED', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'];
export const USER_ROLE = ['ROLE_ADMIN', 'ROLE_USER'];
export const POST_VISIBILITY = ['PUBLIC', 'PRIVATE', 'FOLLOWERS'];

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR');
};

export const shortText = (text, limit = 60) => {
  if (!text) return '-';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

export const extractErrorMessage = (error, fallback = '요청 처리 중 오류가 발생했습니다.') =>
  error?.response?.data?.message || error?.message || fallback;

