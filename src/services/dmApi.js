import axios from 'axios';
import { API_CONFIG } from '../config';

const buildAuthConfig = (accessToken, extra = {}) => ({
  ...extra,
  headers: {
    ...(extra.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  },
  withCredentials: true,
});

const extractData = (response) => response?.data?.data ?? response?.data;

export const dmApi = {
  async createOrGetRoom(targetUserId, accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms`;
    const response = await axios.post(
      url,
      { targetUserId },
      buildAuthConfig(accessToken)
    );
    return extractData(response);
  },

  async getRooms(accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms`;
    const response = await axios.get(url, buildAuthConfig(accessToken));
    const data = extractData(response);
    return Array.isArray(data) ? data : [];
  },

  async getMessages(roomId, accessToken, page = 0, size = 50) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms/${roomId}/messages`;
    const response = await axios.get(
      url,
      buildAuthConfig(accessToken, {
        params: { page, size },
      })
    );
    const data = extractData(response);
    return Array.isArray(data?.content) ? data.content : [];
  },

  async sendMessage(roomId, content, accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms/${roomId}/messages`;
    const response = await axios.post(
      url,
      { content },
      buildAuthConfig(accessToken)
    );
    return extractData(response);
  },

  async markAsRead(roomId, accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms/${roomId}/read`;
    await axios.put(url, {}, buildAuthConfig(accessToken));
  },

  async getNewMessages(roomId, lastMessageId, accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms/${roomId}/messages/new`;
    const response = await axios.get(
      url,
      buildAuthConfig(accessToken, {
        params: { lastMessageId },
      })
    );
    const data = extractData(response);
    return Array.isArray(data) ? data : [];
  },

  async leaveRoom(roomId, accessToken) {
    const url = `${API_CONFIG.baseUrl}/dm/rooms/${roomId}`;
    await axios.delete(url, buildAuthConfig(accessToken));
  },
};

