import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { normalizeImageUrl } from '../utils/imageUrl';
import { dmApi } from '../services/dmApi';
import './DirectMessage.css';

const POLLING_INTERVAL_MS = 3000;

const sortMessagesAsc = (messages) =>
  [...messages].sort((a, b) => {
    if (a.id && b.id) return a.id - b.id;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

const mergeMessages = (current, incoming) => {
  const byId = new Map();
  [...current, ...incoming].forEach((message) => {
    if (message?.id !== undefined && message?.id !== null) {
      byId.set(message.id, message);
    }
  });
  return sortMessagesAsc(Array.from(byId.values()));
};

function DirectMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const pollingRef = useRef(false);

  const selectedRoom = useMemo(
    () => rooms.find((room) => Number(room.roomId) === Number(selectedRoomId)) || null,
    [rooms, selectedRoomId]
  );

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchRooms = useCallback(async () => {
    if (!accessToken) return [];
    const roomList = await dmApi.getRooms(accessToken);
    setRooms(roomList);
    return roomList;
  }, [accessToken]);

  const fetchMessages = useCallback(async (roomId, { markRead = true } = {}) => {
    if (!accessToken || !roomId) return;
    setMessagesLoading(true);
    try {
      const fetched = await dmApi.getMessages(roomId, accessToken, 0, 50);
      const ascMessages = sortMessagesAsc(fetched);
      setMessages(ascMessages);
      const latestId = ascMessages[ascMessages.length - 1]?.id || 0;
      lastMessageIdRef.current = latestId;

      if (markRead) {
        await dmApi.markAsRead(roomId, accessToken);
        await fetchRooms();
      }
    } catch (error) {
      console.error('DM 메시지 조회 실패:', error);
      alert('메시지를 불러오지 못했습니다.');
    } finally {
      setMessagesLoading(false);
    }
  }, [accessToken, fetchRooms]);

  useEffect(() => {
    if (!isAuthenticated && !roomsLoading) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate, roomsLoading]);

  useEffect(() => {
    if (!accessToken) {
      setRoomsLoading(false);
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const params = new URLSearchParams(location.search);
        const roomIdFromQuery = Number(params.get('roomId'));
        const userIdFromQuery = Number(params.get('userId'));

        let preferredRoomId = Number.isFinite(roomIdFromQuery) && roomIdFromQuery > 0
          ? roomIdFromQuery
          : null;

        if (
          Number.isFinite(userIdFromQuery) &&
          userIdFromQuery > 0 &&
          Number(userIdFromQuery) !== Number(user?.id)
        ) {
          const roomData = await dmApi.createOrGetRoom(userIdFromQuery, accessToken);
          preferredRoomId = roomData?.roomId || roomData?.id || preferredRoomId;
        }

        const roomList = await fetchRooms();
        if (!isMounted) return;

        if (preferredRoomId) {
          setSelectedRoomId(preferredRoomId);
        } else if (
          selectedRoomId &&
          roomList.some((room) => Number(room.roomId) === Number(selectedRoomId))
        ) {
          setSelectedRoomId(selectedRoomId);
        } else {
          setSelectedRoomId(roomList[0]?.roomId || null);
        }
      } catch (error) {
        console.error('DM 초기화 실패:', error);
        if (isMounted) {
          setRoomsError('DM 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) {
          setRoomsLoading(false);
        }
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, [accessToken, fetchRooms, location.search, user?.id]);

  useEffect(() => {
    if (!selectedRoomId || !accessToken) {
      setMessages([]);
      lastMessageIdRef.current = 0;
      return;
    }
    fetchMessages(selectedRoomId);
  }, [accessToken, fetchMessages, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !accessToken) return undefined;

    const pollNewMessages = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const newMessages = await dmApi.getNewMessages(
          selectedRoomId,
          lastMessageIdRef.current || 0,
          accessToken
        );

        if (newMessages.length > 0) {
          setMessages((prev) => {
            const merged = mergeMessages(prev, newMessages);
            lastMessageIdRef.current = merged[merged.length - 1]?.id || 0;
            return merged;
          });

          const hasIncomingFromOther = newMessages.some((msg) => !msg.isMine);
          if (hasIncomingFromOther) {
            await dmApi.markAsRead(selectedRoomId, accessToken);
          }
          await fetchRooms();
        }
      } catch (error) {
        console.error('DM 폴링 실패:', error);
      } finally {
        pollingRef.current = false;
      }
    };

    const intervalId = window.setInterval(pollNewMessages, POLLING_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [accessToken, fetchRooms, selectedRoomId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    navigate(`/dm?roomId=${roomId}`, { replace: true });
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedRoomId || !accessToken || isSending) return;

    setIsSending(true);
    try {
      const sent = await dmApi.sendMessage(selectedRoomId, trimmed, accessToken);
      setMessages((prev) => {
        const merged = mergeMessages(prev, [sent]);
        lastMessageIdRef.current = merged[merged.length - 1]?.id || 0;
        return merged;
      });
      setMessageInput('');
      await fetchRooms();
    } catch (error) {
      console.error('DM 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoomId || !accessToken) return;
    if (!window.confirm('채팅방을 나가시겠습니까?')) return;

    try {
      await dmApi.leaveRoom(selectedRoomId, accessToken);
      const refreshed = await fetchRooms();
      const nextRoomId = refreshed[0]?.roomId || null;
      setSelectedRoomId(nextRoomId);
      navigate(nextRoomId ? `/dm?roomId=${nextRoomId}` : '/dm', { replace: true });
    } catch (error) {
      console.error('DM 채팅방 나가기 실패:', error);
      alert('채팅방 나가기에 실패했습니다.');
    }
  };

  if (!isAuthenticated && !roomsLoading) {
    return null;
  }

  return (
    <>
      <GNB />
      <div className="dm-page">
        <section className="dm-room-panel">
          <h1 className="dm-title">Direct Message</h1>

          {roomsLoading ? (
            <p className="dm-empty-text">채팅방을 불러오는 중...</p>
          ) : roomsError ? (
            <p className="dm-empty-text">{roomsError}</p>
          ) : rooms.length === 0 ? (
            <p className="dm-empty-text">아직 DM 채팅방이 없습니다.</p>
          ) : (
            <ul className="dm-room-list">
              {rooms.map((room) => {
                const isActive = Number(room.roomId) === Number(selectedRoomId);
                const otherImage = normalizeImageUrl(room.otherUser?.profileImage || null);
                return (
                  <li key={room.roomId}>
                    <button
                      type="button"
                      className={`dm-room-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectRoom(room.roomId)}
                    >
                      {otherImage ? (
                        <img
                          src={otherImage}
                          alt={room.otherUser?.name}
                          className="dm-room-avatar"
                        />
                      ) : (
                        <div className="dm-room-avatar placeholder">
                          {room.otherUser?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="dm-room-info">
                        <p className="dm-room-name">{room.otherUser?.name || '알 수 없음'}</p>
                        <p className="dm-room-preview">
                          {room.lastMessage?.content || '아직 메시지가 없습니다.'}
                        </p>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="dm-unread-badge">{room.unreadCount}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dm-chat-panel">
          {selectedRoom ? (
            <>
              <header className="dm-chat-header">
                <div className="dm-chat-user">
                  <strong>{selectedRoom.otherUser?.name || '알 수 없음'}</strong>
                </div>
                <button type="button" className="dm-leave-btn" onClick={handleLeaveRoom}>
                  나가기
                </button>
              </header>

              <div className="dm-message-list">
                {messagesLoading ? (
                  <p className="dm-empty-text">메시지를 불러오는 중...</p>
                ) : messages.length === 0 ? (
                  <p className="dm-empty-text">첫 메시지를 보내보세요.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`dm-message-item ${message.isMine ? 'mine' : 'other'}`}
                    >
                      <p className="dm-message-content">{message.content}</p>
                      <span className="dm-message-time">{formatTime(message.createdAt)}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form className="dm-message-form" onSubmit={handleSendMessage}>
                <textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  className="dm-message-input"
                  placeholder="메시지를 입력하세요..."
                  maxLength={2000}
                  rows={2}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage(event);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="dm-send-btn"
                  disabled={isSending || !messageInput.trim()}
                >
                  {isSending ? '전송 중...' : '전송'}
                </button>
              </form>
            </>
          ) : (
            <div className="dm-empty-state">
              <p>왼쪽에서 대화할 사용자를 선택하세요.</p>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}

export default DirectMessage;
