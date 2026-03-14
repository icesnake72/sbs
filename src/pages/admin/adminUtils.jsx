// ── 상수: 사용자 상태 목록 ──
export const USER_STATUS = ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'DELETED', 'PENDING_VERIFICATION'];

// ── 상수: 사용자 역할 목록 ──
export const USER_ROLE = ['ROLE_ADMIN', 'ROLE_USER'];

// ── 상수: 게시글 공개범위 목록 ──
export const POST_VISIBILITY = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'];

// ── 상태별 배지 스타일 설정 ──
export const STATUS_CONFIG = {
  ACTIVE:               { label: '활성',     color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)' },
  SUSPENDED:            { label: '정지',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)' },
  DELETED:              { label: '삭제',     color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)' },
  INACTIVE:             { label: '비활성',   color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.35)' },
  PENDING_VERIFICATION: { label: '인증대기', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)' },
};

// ── 역할별 배지 스타일 설정 ──
export const ROLE_CONFIG = {
  ROLE_ADMIN: { label: 'ADMIN', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  ROLE_USER:  { label: 'USER',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
};

// ── 날짜+시간 포맷 함수 ──
export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR');
};

// ── 날짜만 포맷 함수 ──
export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR');
};

// ── 텍스트 자르기 (기본 60자) ──
export const shortText = (text, limit = 60) => {
  if (!text) return '-';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

// ── 에러 메시지 추출 함수 ──
export const extractErrorMessage = (error, fallback = '요청 처리 중 오류가 발생했습니다.') =>
  error?.response?.data?.message || error?.message || fallback;

// ── StatusBadge: 사용자 상태를 색상 배지로 표시하는 컴포넌트 ──
export function StatusBadge({ status }) {
  // 설정에 없는 상태는 회색으로 처리
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── RoleBadge: 사용자 역할을 색상 배지로 표시하는 컴포넌트 ──
export function RoleBadge({ role }) {
  // 설정에 없는 역할은 기본 회색으로 처리
  const cfg = ROLE_CONFIG[role] || { label: role, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── 게시글 공개범위 배지 스타일 설정 (내부 상수) ──
const VIS_CONFIG = {
  PUBLIC:    { label: '전체공개', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
  FOLLOWERS: { label: '팔로워',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
  PRIVATE:   { label: '비공개',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
};

// ── VisibilityBadge: 게시글 공개범위를 색상 배지로 표시하는 컴포넌트 ──
export function VisibilityBadge({ visibility }) {
  // 설정에 없는 공개범위는 투명 배경으로 처리
  const cfg = VIS_CONFIG[visibility] || { label: visibility, color: '#9ca3af', bg: 'transparent', border: 'transparent' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── ConfirmModal: 확인/취소 다이얼로그 모달 컴포넌트 ──
// isOpen: 모달 표시 여부
// title: 모달 제목
// message: 본문 메시지
// confirmText: 확인 버튼 텍스트 (기본 '확인')
// cancelText: 취소 버튼 텍스트 (기본 '취소')
// danger: true이면 확인 버튼을 빨간색으로 표시
// extra: 모달 내 추가 UI (select, textarea 등)
// onConfirm: 확인 버튼 클릭 핸들러
// onCancel: 취소 버튼 클릭 핸들러
export function ConfirmModal({ isOpen, title, message, confirmText = '확인', cancelText = '취소', danger = false, extra, onConfirm, onCancel }) {
  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'rgba(26,26,38,0.98)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        padding: '1.5rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* 모달 제목 */}
        <h3 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: '1rem' }}>{title}</h3>
        {/* 모달 메시지 */}
        <p style={{ margin: '0 0 1.2rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', lineHeight: 1.5 }}>{message}</p>
        {/* 추가 UI 영역 (select, textarea 등) */}
        {extra && <div style={{ marginBottom: '1.2rem' }}>{extra}</div>}
        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {/* 취소 버튼 */}
          <button onClick={onCancel} style={{
            padding: '0.45rem 1rem',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}>{cancelText}</button>
          {/* 확인 버튼 (danger 여부에 따라 색상 변경) */}
          <button onClick={onConfirm} style={{
            padding: '0.45rem 1rem',
            border: 'none',
            borderRadius: '8px',
            background: danger ? '#ef4444' : 'linear-gradient(135deg,#667eea,#764ba2)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination: 페이지네이션 컴포넌트 ──
// currentPage: 현재 페이지 (0-indexed)
// totalPages: 전체 페이지 수
// onPageChange: 페이지 변경 핸들러
export function Pagination({ currentPage, totalPages, onPageChange }) {
  // 페이지가 1개 이하면 렌더링하지 않음
  if (!totalPages || totalPages <= 1) return null;

  // 현재 페이지 기준으로 최대 5개의 페이지 번호 계산
  const start = Math.max(0, currentPage - 2);
  const end = Math.min(totalPages - 1, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="admin-pagination">
      {/* 이전 페이지 버튼 */}
      <button
        className="admin-btn"
        disabled={currentPage <= 0}
        onClick={() => onPageChange(currentPage - 1)}
      >◀</button>
      {/* 처음 페이지가 생략된 경우 줄임표 표시 */}
      {start > 0 && <span className="admin-page-ellipsis">…</span>}
      {/* 페이지 번호 버튼 목록 */}
      {pages.map((p) => (
        <button
          key={p}
          className={`admin-page-btn ${p === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </button>
      ))}
      {/* 마지막 페이지가 생략된 경우 줄임표 표시 */}
      {end < totalPages - 1 && <span className="admin-page-ellipsis">…</span>}
      {/* 다음 페이지 버튼 */}
      <button
        className="admin-btn"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >▶</button>
      {/* 현재 페이지 / 전체 페이지 표시 */}
      <span className="admin-page-info">{currentPage + 1} / {totalPages}</span>
    </div>
  );
}
