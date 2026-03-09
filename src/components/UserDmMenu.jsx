import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import './UserDmMenu.css';

function UserDmMenu({
  targetUserId,
  targetUserName,
  imageUrl,
  avatarClassName,
  placeholderClassName,
  wrapperClassName = '',
  preventParentNavigation = false,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const currentUserId = user?.id;
  const hasTarget = targetUserId !== null && targetUserId !== undefined;
  const isSelf = hasTarget && Number(currentUserId) === Number(targetUserId);
  const canOpenMenu = hasTarget && !isSelf;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const stopParentNavigation = (event) => {
    if (!preventParentNavigation) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAvatarClick = (event) => {
    stopParentNavigation(event);
    if (!canOpenMenu) return;
    setIsOpen((prev) => !prev);
  };

  const handleDirectMessage = (event) => {
    stopParentNavigation(event);
    setIsOpen(false);

    if (!isAuthenticated) {
      alert('DM을 보내려면 로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    navigate(`/dm?userId=${targetUserId}`);
  };

  return (
    <div ref={menuRef} className={`user-dm-menu ${wrapperClassName}`}>
      <button
        type="button"
        onClick={handleAvatarClick}
        className={`user-dm-avatar-trigger ${!canOpenMenu ? 'disabled' : ''}`}
        aria-haspopup={canOpenMenu ? 'menu' : undefined}
        aria-expanded={canOpenMenu ? isOpen : undefined}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={targetUserName} className={avatarClassName} />
        ) : (
          <div className={placeholderClassName}>
            {targetUserName?.charAt(0) || '?'}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="user-dm-dropdown" role="menu">
          <button type="button" className="user-dm-item" onClick={handleDirectMessage}>
            Direct Message
          </button>
        </div>
      )}
    </div>
  );
}

export default UserDmMenu;

